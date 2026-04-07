-- ProtonDB Status Plugin - Lua backend
-- Fetches ProtonDB ratings on behalf of the frontend (no CORS restrictions)

local http = require("http")
local json = require("json")
local logger = require("logger")
local millennium = require("millennium")

-- Global callable: invoked from frontend via callable('FetchProtonDb')
function FetchProtonDb(appId)
    if not appId then
        return json.encode({ error = "missing appId" })
    end

    local url = "https://www.protondb.com/api/v1/reports/summaries/" .. tostring(appId) .. ".json"

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

    return res.body
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
