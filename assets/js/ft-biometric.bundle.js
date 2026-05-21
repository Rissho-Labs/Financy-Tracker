var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@capacitor/core/dist/index.js
var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
var init_dist = __esm({
  "node_modules/@capacitor/core/dist/index.js"() {
    (function(ExceptionCode2) {
      ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
      ExceptionCode2["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    CapacitorException = class extends Error {
      constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
      }
    };
    getPlatformId = (win) => {
      var _a, _b;
      if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return "android";
      } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return "ios";
      } else {
        return "web";
      }
    };
    createCapacitor = (win) => {
      const capCustomPlatform = win.CapacitorCustomPlatform || null;
      const cap = win.Capacitor || {};
      const Plugins = cap.Plugins = cap.Plugins || {};
      const getPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
      };
      const isNativePlatform = () => getPlatform() !== "web";
      const isPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
          return true;
        }
        if (getPluginHeader(pluginName)) {
          return true;
        }
        return false;
      };
      const getPluginHeader = (pluginName) => {
        var _a;
        return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
      };
      const handleError = (err) => win.console.error(err);
      const registeredPlugins = /* @__PURE__ */ new Map();
      const registerPlugin2 = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
          console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
          return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
          if (!jsImplementation && platform in jsImplementations) {
            jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
          } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
            jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
          }
          return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
          var _a, _b;
          if (pluginHeader) {
            const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
            if (methodHeader) {
              if (methodHeader.rtype === "promise") {
                return (options) => cap.nativePromise(pluginName, prop.toString(), options);
              } else {
                return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
              }
            } else if (impl) {
              return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
            }
          } else if (impl) {
            return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
          } else {
            throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        };
        const createPluginMethodWrapper = (prop) => {
          let remove;
          const wrapper = (...args) => {
            const p = loadPluginImplementation().then((impl) => {
              const fn = createPluginMethod(impl, prop);
              if (fn) {
                const p2 = fn(...args);
                remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                return p2;
              } else {
                throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
              }
            });
            if (prop === "addListener") {
              p.remove = async () => remove();
            }
            return p;
          };
          wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
          Object.defineProperty(wrapper, "name", {
            value: prop,
            writable: false,
            configurable: false
          });
          return wrapper;
        };
        const addListener = createPluginMethodWrapper("addListener");
        const removeListener = createPluginMethodWrapper("removeListener");
        const addListenerNative = (eventName, callback) => {
          const call = addListener({ eventName }, callback);
          const remove = async () => {
            const callbackId = await call;
            removeListener({
              eventName,
              callbackId
            }, callback);
          };
          const p = new Promise((resolve) => call.then(() => resolve({ remove })));
          p.remove = async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          };
          return p;
        };
        const proxy = new Proxy({}, {
          get(_, prop) {
            switch (prop) {
              // https://github.com/facebook/react/issues/20030
              case "$$typeof":
                return void 0;
              case "toJSON":
                return () => ({});
              case "addListener":
                return pluginHeader ? addListenerNative : addListener;
              case "removeListener":
                return removeListener;
              default:
                return createPluginMethodWrapper(prop);
            }
          }
        });
        Plugins[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
          name: pluginName,
          proxy,
          platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
        });
        return proxy;
      };
      if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
      }
      cap.getPlatform = getPlatform;
      cap.handleError = handleError;
      cap.isNativePlatform = isNativePlatform;
      cap.isPluginAvailable = isPluginAvailable;
      cap.registerPlugin = registerPlugin2;
      cap.Exception = CapacitorException;
      cap.DEBUG = !!cap.DEBUG;
      cap.isLoggingEnabled = !!cap.isLoggingEnabled;
      return cap;
    };
    initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
    Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    registerPlugin = Capacitor.registerPlugin;
    WebPlugin = class {
      constructor() {
        this.listeners = {};
        this.retainedEventArguments = {};
        this.windowListeners = {};
      }
      addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
          this.listeners[eventName] = [];
          firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
          this.addWindowListener(windowListener);
        }
        if (firstListener) {
          this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        return p;
      }
      async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
          this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
      }
      notifyListeners(eventName, data, retainUntilConsumed) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          if (retainUntilConsumed) {
            let args = this.retainedEventArguments[eventName];
            if (!args) {
              args = [];
            }
            args.push(data);
            this.retainedEventArguments[eventName] = args;
          }
          return;
        }
        listeners.forEach((listener) => listener(data));
      }
      hasListeners(eventName) {
        var _a;
        return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
      }
      registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
          registered: false,
          windowEventName,
          pluginEventName,
          handler: (event) => {
            this.notifyListeners(pluginEventName, event);
          }
        };
      }
      unimplemented(msg = "not implemented") {
        return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
      }
      unavailable(msg = "not available") {
        return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
      }
      async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          return;
        }
        const index = listeners.indexOf(listenerFunc);
        this.listeners[eventName].splice(index, 1);
        if (!this.listeners[eventName].length) {
          this.removeWindowListener(this.windowListeners[eventName]);
        }
      }
      addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
      }
      removeWindowListener(handle) {
        if (!handle) {
          return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
      }
      sendRetainedArgumentsForEvent(eventName) {
        const args = this.retainedEventArguments[eventName];
        if (!args) {
          return;
        }
        delete this.retainedEventArguments[eventName];
        args.forEach((arg) => {
          this.notifyListeners(eventName, arg);
        });
      }
    };
    encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
    CapacitorCookiesPluginWeb = class extends WebPlugin {
      async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(";").forEach((cookie) => {
          if (cookie.length <= 0)
            return;
          let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
          key = decode(key).trim();
          value = decode(value).trim();
          cookieMap[key] = value;
        });
        return cookieMap;
      }
      async setCookie(options) {
        try {
          const encodedKey = encode(options.key);
          const encodedValue = encode(options.value);
          const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
          const path = (options.path || "/").replace("path=", "");
          const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
          document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async deleteCookie(options) {
        try {
          document.cookie = `${options.key}=; Max-Age=0`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearCookies() {
        try {
          const cookies = document.cookie.split(";") || [];
          for (const cookie of cookies) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearAllCookies() {
        try {
          await this.clearCookies();
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    CapacitorCookies = registerPlugin("CapacitorCookies", {
      web: () => new CapacitorCookiesPluginWeb()
    });
    readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    normalizeHttpHeaders = (headers = {}) => {
      const originalKeys = Object.keys(headers);
      const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
      const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
      }, {});
      return normalized;
    };
    buildUrlParams = (params, shouldEncode = true) => {
      if (!params)
        return null;
      const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
          item = "";
          value.forEach((str) => {
            encodedValue = shouldEncode ? encodeURIComponent(str) : str;
            item += `${key}=${encodedValue}&`;
          });
          item.slice(0, -1);
        } else {
          encodedValue = shouldEncode ? encodeURIComponent(value) : value;
          item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
      }, "");
      return output.substr(1);
    };
    buildRequestInit = (options, extra = {}) => {
      const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
      const headers = normalizeHttpHeaders(options.headers);
      const type = headers["content-type"] || "";
      if (typeof options.data === "string") {
        output.body = options.data;
      } else if (type.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
          params.set(key, value);
        }
        output.body = params.toString();
      } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
          options.data.forEach((value, key) => {
            form.append(key, value);
          });
        } else {
          for (const key of Object.keys(options.data)) {
            form.append(key, options.data[key]);
          }
        }
        output.body = form;
        const headers2 = new Headers(output.headers);
        headers2.delete("content-type");
        output.headers = headers2;
      } else if (type.includes("application/json") || typeof options.data === "object") {
        output.body = JSON.stringify(options.data);
      }
      return output;
    };
    CapacitorHttpPluginWeb = class extends WebPlugin {
      /**
       * Perform an Http request given a set of options
       * @param options Options to build the HTTP request
       */
      async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get("content-type") || "";
        let { responseType = "text" } = response.ok ? options : {};
        if (contentType.includes("application/json")) {
          responseType = "json";
        }
        let data;
        let blob;
        switch (responseType) {
          case "arraybuffer":
          case "blob":
            blob = await response.blob();
            data = await readBlobAsBase64(blob);
            break;
          case "json":
            data = await response.json();
            break;
          case "document":
          case "text":
          default:
            data = await response.text();
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data,
          headers,
          status: response.status,
          url: response.url
        };
      }
      /**
       * Perform an Http GET request given a set of options
       * @param options Options to build the HTTP request
       */
      async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
      }
      /**
       * Perform an Http POST request given a set of options
       * @param options Options to build the HTTP request
       */
      async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
      }
      /**
       * Perform an Http PUT request given a set of options
       * @param options Options to build the HTTP request
       */
      async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
      }
      /**
       * Perform an Http PATCH request given a set of options
       * @param options Options to build the HTTP request
       */
      async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
      }
      /**
       * Perform an Http DELETE request given a set of options
       * @param options Options to build the HTTP request
       */
      async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
      }
    };
    CapacitorHttp = registerPlugin("CapacitorHttp", {
      web: () => new CapacitorHttpPluginWeb()
    });
    (function(SystemBarsStyle2) {
      SystemBarsStyle2["Dark"] = "DARK";
      SystemBarsStyle2["Light"] = "LIGHT";
      SystemBarsStyle2["Default"] = "DEFAULT";
    })(SystemBarsStyle || (SystemBarsStyle = {}));
    (function(SystemBarType2) {
      SystemBarType2["StatusBar"] = "StatusBar";
      SystemBarType2["NavigationBar"] = "NavigationBar";
    })(SystemBarType || (SystemBarType = {}));
    SystemBarsPluginWeb = class extends WebPlugin {
      async setStyle() {
        this.unavailable("not available for web");
      }
      async setAnimation() {
        this.unavailable("not available for web");
      }
      async show() {
        this.unavailable("not available for web");
      }
      async hide() {
        this.unavailable("not available for web");
      }
    };
    SystemBars = registerPlugin("SystemBars", {
      web: () => new SystemBarsPluginWeb()
    });
  }
});

// node_modules/@capgo/capacitor-native-biometric/dist/esm/definitions.js
var BiometryType, AuthenticationStrength, AccessControl, BiometricAuthError;
var init_definitions = __esm({
  "node_modules/@capgo/capacitor-native-biometric/dist/esm/definitions.js"() {
    (function(BiometryType2) {
      BiometryType2[BiometryType2["NONE"] = 0] = "NONE";
      BiometryType2[BiometryType2["TOUCH_ID"] = 1] = "TOUCH_ID";
      BiometryType2[BiometryType2["FACE_ID"] = 2] = "FACE_ID";
      BiometryType2[BiometryType2["FINGERPRINT"] = 3] = "FINGERPRINT";
      BiometryType2[BiometryType2["FACE_AUTHENTICATION"] = 4] = "FACE_AUTHENTICATION";
      BiometryType2[BiometryType2["IRIS_AUTHENTICATION"] = 5] = "IRIS_AUTHENTICATION";
      BiometryType2[BiometryType2["MULTIPLE"] = 6] = "MULTIPLE";
      BiometryType2[BiometryType2["DEVICE_CREDENTIAL"] = 7] = "DEVICE_CREDENTIAL";
    })(BiometryType || (BiometryType = {}));
    (function(AuthenticationStrength2) {
      AuthenticationStrength2[AuthenticationStrength2["NONE"] = 0] = "NONE";
      AuthenticationStrength2[AuthenticationStrength2["STRONG"] = 1] = "STRONG";
      AuthenticationStrength2[AuthenticationStrength2["WEAK"] = 2] = "WEAK";
    })(AuthenticationStrength || (AuthenticationStrength = {}));
    (function(AccessControl2) {
      AccessControl2[AccessControl2["NONE"] = 0] = "NONE";
      AccessControl2[AccessControl2["BIOMETRY_CURRENT_SET"] = 1] = "BIOMETRY_CURRENT_SET";
      AccessControl2[AccessControl2["BIOMETRY_ANY"] = 2] = "BIOMETRY_ANY";
    })(AccessControl || (AccessControl = {}));
    (function(BiometricAuthError2) {
      BiometricAuthError2[BiometricAuthError2["UNKNOWN_ERROR"] = 0] = "UNKNOWN_ERROR";
      BiometricAuthError2[BiometricAuthError2["BIOMETRICS_UNAVAILABLE"] = 1] = "BIOMETRICS_UNAVAILABLE";
      BiometricAuthError2[BiometricAuthError2["USER_LOCKOUT"] = 2] = "USER_LOCKOUT";
      BiometricAuthError2[BiometricAuthError2["BIOMETRICS_NOT_ENROLLED"] = 3] = "BIOMETRICS_NOT_ENROLLED";
      BiometricAuthError2[BiometricAuthError2["USER_TEMPORARY_LOCKOUT"] = 4] = "USER_TEMPORARY_LOCKOUT";
      BiometricAuthError2[BiometricAuthError2["AUTHENTICATION_FAILED"] = 10] = "AUTHENTICATION_FAILED";
      BiometricAuthError2[BiometricAuthError2["APP_CANCEL"] = 11] = "APP_CANCEL";
      BiometricAuthError2[BiometricAuthError2["INVALID_CONTEXT"] = 12] = "INVALID_CONTEXT";
      BiometricAuthError2[BiometricAuthError2["NOT_INTERACTIVE"] = 13] = "NOT_INTERACTIVE";
      BiometricAuthError2[BiometricAuthError2["PASSCODE_NOT_SET"] = 14] = "PASSCODE_NOT_SET";
      BiometricAuthError2[BiometricAuthError2["SYSTEM_CANCEL"] = 15] = "SYSTEM_CANCEL";
      BiometricAuthError2[BiometricAuthError2["USER_CANCEL"] = 16] = "USER_CANCEL";
      BiometricAuthError2[BiometricAuthError2["USER_FALLBACK"] = 17] = "USER_FALLBACK";
    })(BiometricAuthError || (BiometricAuthError = {}));
  }
});

// node_modules/@capgo/capacitor-native-biometric/dist/esm/web.js
var web_exports = {};
__export(web_exports, {
  NativeBiometricWeb: () => NativeBiometricWeb
});
var NativeBiometricWeb;
var init_web = __esm({
  "node_modules/@capgo/capacitor-native-biometric/dist/esm/web.js"() {
    init_dist();
    init_definitions();
    NativeBiometricWeb = class extends WebPlugin {
      constructor() {
        super();
        this.credentialStore = /* @__PURE__ */ new Map();
      }
      isAvailable() {
        return Promise.resolve({
          isAvailable: true,
          authenticationStrength: AuthenticationStrength.STRONG,
          biometryType: BiometryType.TOUCH_ID,
          deviceIsSecure: true,
          strongBiometryIsAvailable: true
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async addListener(_eventName, _listener) {
        return {
          remove: async () => {
          }
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      verifyIdentity(_options) {
        console.log("verifyIdentity (dummy implementation)");
        return Promise.resolve();
      }
      getCredentials(_options) {
        console.log("getCredentials (dummy implementation)", { server: _options.server });
        const credentials = this.credentialStore.get(_options.server);
        if (!credentials) {
          throw new Error("No credentials found for the specified server");
        }
        return Promise.resolve(credentials);
      }
      getSecureCredentials(_options) {
        console.log("getSecureCredentials (dummy implementation)", { server: _options.server });
        const credentials = this.credentialStore.get(_options.server);
        if (!credentials) {
          throw new Error("No credentials found for the specified server");
        }
        return Promise.resolve(credentials);
      }
      setCredentials(_options) {
        console.log("setCredentials (dummy implementation)", { server: _options.server });
        this.credentialStore.set(_options.server, {
          username: _options.username,
          password: _options.password
        });
        return Promise.resolve();
      }
      deleteCredentials(_options) {
        console.log("deleteCredentials (dummy implementation)", { server: _options.server });
        this.credentialStore.delete(_options.server);
        return Promise.resolve();
      }
      isCredentialsSaved(_options) {
        console.log("isCredentialsSaved (dummy implementation)", { server: _options.server });
        return Promise.resolve({ isSaved: this.credentialStore.has(_options.server) });
      }
      async getPluginVersion() {
        return { version: "web" };
      }
    };
  }
});

// node_modules/@capgo/capacitor-native-biometric/dist/esm/index.js
init_dist();
init_definitions();
var NativeBiometric = registerPlugin("NativeBiometric", {
  web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.NativeBiometricWeb())
});

// scripts/biometric-entry.mjs
async function isNativeBiometricAvailable() {
  try {
    const res = await NativeBiometric.isAvailable({ useFallback: true });
    return !!(res.isAvailable || res.deviceIsSecure);
  } catch (_) {
    return false;
  }
}
async function hasStoredCredentials(server) {
  try {
    const creds = await NativeBiometric.getCredentials({ server });
    return !!(creds && creds.username);
  } catch (_) {
    return false;
  }
}
async function getStoredBiometricEmail(server) {
  try {
    const creds = await NativeBiometric.getCredentials({ server });
    if (!creds || !creds.username) return null;
    return String(creds.username).trim();
  } catch (_) {
    return null;
  }
}
async function verifyBiometricIdentity(opts) {
  const o = opts || {};
  await NativeBiometric.verifyIdentity({
    reason: o.reason || "Confirmar identidade",
    title: o.title || "Finance Tracker",
    subtitle: o.subtitle || "",
    description: o.description || ""
  });
}
async function tryNativeBiometricLogin(server) {
  try {
    const res = await NativeBiometric.isAvailable({ useFallback: true });
    if (!res.isAvailable && !res.deviceIsSecure) {
      return { ok: false, reason: "unavailable" };
    }
    await verifyBiometricIdentity({
      reason: "Use sua biometria para entrar no Finance Tracker",
      title: "Entrar"
    });
    const creds = await NativeBiometric.getCredentials({ server });
    if (!creds || !creds.username) {
      return { ok: false, reason: "no-credentials" };
    }
    return {
      ok: true,
      email: creds.username,
      password: creds.password || ""
    };
  } catch (e) {
    return { ok: false, reason: e && e.message ? e.message : String(e) };
  }
}
async function saveNativeBiometricCredentials(server, email, password) {
  const available = await isNativeBiometricAvailable();
  if (!available) {
    const err = new Error("biometrics_unavailable");
    err.code = "bio/unavailable";
    throw err;
  }
  await verifyBiometricIdentity({
    reason: "Confirme para ativar o login com biometria",
    title: "Ativar biometria",
    subtitle: "Finance Tracker"
  });
  await NativeBiometric.setCredentials({
    server,
    username: String(email).trim(),
    password: password || ""
  });
}
async function deleteNativeBiometricCredentials(server) {
  try {
    await NativeBiometric.deleteCredentials({ server });
  } catch (_) {
  }
}
export {
  deleteNativeBiometricCredentials,
  getStoredBiometricEmail,
  hasStoredCredentials,
  isNativeBiometricAvailable,
  saveNativeBiometricCredentials,
  tryNativeBiometricLogin,
  verifyBiometricIdentity
};
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
