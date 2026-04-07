// Suppress TS7026: JSX element implicitly has type 'any'
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// window globals used by this plugin
interface Window {
  SP_REACT: {
    createElement: Function;
    Fragment: any;
    [key: string]: any;
  };
  MainWindowBrowserManager?: {
    m_lastLocation?: {
      pathname: string;
    };
  };
}

// Millennium global
declare const Millennium: {
  AddWindowCreateHook?: (callback: (context: object) => void | (() => void)) => void;
  [key: string]: any;
};
