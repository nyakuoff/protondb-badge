-- ProtonDB Status Plugin - Lua backend
-- Fetches ProtonDB ratings on behalf of the frontend (no CORS restrictions)

local http = require("http")
local json = require("json")
local logger = require("logger")
local millennium = require("millennium")

local PROTONDB_URL = "https://www.protondb.com/api/v1/reports/summaries/"
local STORE_SEARCH_URL = "https://store.steampowered.com/api/storesearch/"

-- Minimal RFC 3986 percent-encoding for query params
local function url_encode(str)
    return (str:gsub("[^%w%-%.%_%~]", function(c)
        return string.format("%%%02X", string.byte(c))
    end))
end

local function fetch_protondb_summary(appId)
    local url = PROTONDB_URL .. tostring(appId) .. ".json"
    local res, err = http.get(url)

    if not res then
        logger:error("FetchProtonDb request failed: " .. tostring(err))
        return json.encode({ error = tostring(err) })
    end

    if res.status == 404 then
        return json.encode({ error = "not found" })
    end

    if res.status < 200 or res.status >= 300 then
        return json.encode({ error = "status " .. tostring(res.status) })
    end

    local ok, data = pcall(json.decode, res.body)
    if not ok or type(data) ~= "table" then
        logger:error("FetchProtonDb: failed to decode protondb response for appId " .. tostring(appId))
        return json.encode({ error = "bad protondb response" })
    end

    data.resolvedAppId = appId
    return json.encode(data)
end

-- Resolves a title to a real Steam appid via the store search endpoint.
-- Only accepts an exact (case-insensitive) name match — a fuzzy top
-- result could attach the wrong game's rating to a shortcut.
local function resolve_appid_from_title(title)
    local url = STORE_SEARCH_URL .. "?term=" .. url_encode(title) .. "&cc=us&l=english"
    local res, err = http.get(url, { timeout = 5 })

    if not res then
        logger:error("Store search request failed: " .. tostring(err))
        return nil, "search request failed"
    end

    if res.status < 200 or res.status >= 300 then
        return nil, "search status " .. tostring(res.status)
    end

    local ok, data = pcall(json.decode, res.body)
    if not ok or not data or not data.items or #data.items == 0 then
        return nil, "no results"
    end

    return data.items[1].id, nil
end

-- Callable: invoked from frontend via callable('FetchProtonDb')
-- appId: real Steam appid, or a sentinel (e.g. 0) for non-Steam shortcuts
-- title: required when appId is a shortcut sentinel
function FetchProtonDb(appId, title)
    logger:info("FetchProtonDb called with appId=" .. tostring(appId) .. " title=" .. tostring(title))

    if type(appId) == "number" and appId >= 1 and appId == math.floor(appId) then
        return fetch_protondb_summary(appId)
    end

    if type(title) == "string" and #title > 0 then
        local resolvedId, err = resolve_appid_from_title(title)
        logger:info("resolve_appid_from_title -> resolvedId=" .. tostring(resolvedId) .. " err=" .. tostring(err))
        if not resolvedId then
            return json.encode({ error = err or "could not resolve title" })
        end
        return fetch_protondb_summary(resolvedId)
    end

    logger:error("FetchProtonDb: neither valid appId nor title provided")
    return json.encode({ error = "invalid appId type" })
end

local function on_load()
    millennium.ready()
    logger:info("ProtonDB Status backend loaded")
end

local function on_unload()
    logger:info("ProtonDB Status backend unloaded")
end

local function on_frontend_loaded()
end

return {
    on_frontend_loaded = on_frontend_loaded,
    on_load = on_load,
    on_unload = on_unload
}
