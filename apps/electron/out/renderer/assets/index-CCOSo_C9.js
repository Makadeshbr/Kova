const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./TerminalPanel-DbZy1oCb.js","./TerminalPanel-BKlWQB97.css"])))=>i.map(i=>d[i]);
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactJsxRuntime_production;
function requireReactJsxRuntime_production() {
  if (hasRequiredReactJsxRuntime_production) return reactJsxRuntime_production;
  hasRequiredReactJsxRuntime_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
  function jsxProd(type, config, maybeKey) {
    var key = null;
    void 0 !== maybeKey && (key = "" + maybeKey);
    void 0 !== config.key && (key = "" + config.key);
    if ("key" in config) {
      maybeKey = {};
      for (var propName in config)
        "key" !== propName && (maybeKey[propName] = config[propName]);
    } else maybeKey = config;
    config = maybeKey.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== config ? config : null,
      props: maybeKey
    };
  }
  reactJsxRuntime_production.Fragment = REACT_FRAGMENT_TYPE;
  reactJsxRuntime_production.jsx = jsxProd;
  reactJsxRuntime_production.jsxs = jsxProd;
  return reactJsxRuntime_production;
}
var hasRequiredJsxRuntime;
function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime.exports;
  hasRequiredJsxRuntime = 1;
  {
    jsxRuntime.exports = requireReactJsxRuntime_production();
  }
  return jsxRuntime.exports;
}
var jsxRuntimeExports = requireJsxRuntime();
var react = { exports: {} };
var react_production = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReact_production;
function requireReact_production() {
  if (hasRequiredReact_production) return react_production;
  hasRequiredReact_production = 1;
  var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  var ReactNoopUpdateQueue = {
    isMounted: function() {
      return false;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, assign = Object.assign, emptyObject = {};
  function Component(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  Component.prototype.isReactComponent = {};
  Component.prototype.setState = function(partialState, callback) {
    if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, partialState, callback, "setState");
  };
  Component.prototype.forceUpdate = function(callback) {
    this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  };
  function ComponentDummy() {
  }
  ComponentDummy.prototype = Component.prototype;
  function PureComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
  pureComponentPrototype.constructor = PureComponent;
  assign(pureComponentPrototype, Component.prototype);
  pureComponentPrototype.isPureReactComponent = true;
  var isArrayImpl = Array.isArray;
  function noop() {
  }
  var ReactSharedInternals = { H: null, A: null, T: null, S: null }, hasOwnProperty = Object.prototype.hasOwnProperty;
  function ReactElement(type, key, props) {
    var refProp = props.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== refProp ? refProp : null,
      props
    };
  }
  function cloneAndReplaceKey(oldElement, newKey) {
    return ReactElement(oldElement.type, newKey, oldElement.props);
  }
  function isValidElement(object) {
    return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
  }
  function escape(key) {
    var escaperLookup = { "=": "=0", ":": "=2" };
    return "$" + key.replace(/[=:]/g, function(match) {
      return escaperLookup[match];
    });
  }
  var userProvidedKeyEscapeRegex = /\/+/g;
  function getElementKey(element, index) {
    return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
  }
  function resolveThenable(thenable) {
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        throw thenable.reason;
      default:
        switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
          function(fulfilledValue) {
            "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
          },
          function(error) {
            "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
          }
        )), thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
        }
    }
    throw thenable;
  }
  function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
    var type = typeof children;
    if ("undefined" === type || "boolean" === type) children = null;
    var invokeCallback = false;
    if (null === children) invokeCallback = true;
    else
      switch (type) {
        case "bigint":
        case "string":
        case "number":
          invokeCallback = true;
          break;
        case "object":
          switch (children.$$typeof) {
            case REACT_ELEMENT_TYPE:
            case REACT_PORTAL_TYPE:
              invokeCallback = true;
              break;
            case REACT_LAZY_TYPE:
              return invokeCallback = children._init, mapIntoArray(
                invokeCallback(children._payload),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              );
          }
      }
    if (invokeCallback)
      return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
        return c;
      })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
        callback,
        escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
          userProvidedKeyEscapeRegex,
          "$&/"
        ) + "/") + invokeCallback
      )), array.push(callback)), 1;
    invokeCallback = 0;
    var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
    if (isArrayImpl(children))
      for (var i = 0; i < children.length; i++)
        nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if (i = getIteratorFn(children), "function" === typeof i)
      for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
        nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if ("object" === type) {
      if ("function" === typeof children.then)
        return mapIntoArray(
          resolveThenable(children),
          array,
          escapedPrefix,
          nameSoFar,
          callback
        );
      array = String(children);
      throw Error(
        "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return invokeCallback;
  }
  function mapChildren(children, func, context) {
    if (null == children) return children;
    var result = [], count = 0;
    mapIntoArray(children, result, "", "", function(child) {
      return func.call(context, child, count++);
    });
    return result;
  }
  function lazyInitializer(payload) {
    if (-1 === payload._status) {
      var ctor = payload._result;
      ctor = ctor();
      ctor.then(
        function(moduleObject) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 1, payload._result = moduleObject;
        },
        function(error) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 2, payload._result = error;
        }
      );
      -1 === payload._status && (payload._status = 0, payload._result = ctor);
    }
    if (1 === payload._status) return payload._result.default;
    throw payload._result;
  }
  var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
    if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
      var event = new window.ErrorEvent("error", {
        bubbles: true,
        cancelable: true,
        message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
        error
      });
      if (!window.dispatchEvent(event)) return;
    } else if ("object" === typeof process && "function" === typeof process.emit) {
      process.emit("uncaughtException", error);
      return;
    }
    console.error(error);
  }, Children = {
    map: mapChildren,
    forEach: function(children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function() {
          forEachFunc.apply(this, arguments);
        },
        forEachContext
      );
    },
    count: function(children) {
      var n = 0;
      mapChildren(children, function() {
        n++;
      });
      return n;
    },
    toArray: function(children) {
      return mapChildren(children, function(child) {
        return child;
      }) || [];
    },
    only: function(children) {
      if (!isValidElement(children))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return children;
    }
  };
  react_production.Activity = REACT_ACTIVITY_TYPE;
  react_production.Children = Children;
  react_production.Component = Component;
  react_production.Fragment = REACT_FRAGMENT_TYPE;
  react_production.Profiler = REACT_PROFILER_TYPE;
  react_production.PureComponent = PureComponent;
  react_production.StrictMode = REACT_STRICT_MODE_TYPE;
  react_production.Suspense = REACT_SUSPENSE_TYPE;
  react_production.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
  react_production.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(size) {
      return ReactSharedInternals.H.useMemoCache(size);
    }
  };
  react_production.cache = function(fn) {
    return function() {
      return fn.apply(null, arguments);
    };
  };
  react_production.cacheSignal = function() {
    return null;
  };
  react_production.cloneElement = function(element, config, children) {
    if (null === element || void 0 === element)
      throw Error(
        "The argument must be a React element, but you passed " + element + "."
      );
    var props = assign({}, element.props), key = element.key;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
    var propName = arguments.length - 2;
    if (1 === propName) props.children = children;
    else if (1 < propName) {
      for (var childArray = Array(propName), i = 0; i < propName; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    return ReactElement(element.type, key, props);
  };
  react_production.createContext = function(defaultValue) {
    defaultValue = {
      $$typeof: REACT_CONTEXT_TYPE,
      _currentValue: defaultValue,
      _currentValue2: defaultValue,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    };
    defaultValue.Provider = defaultValue;
    defaultValue.Consumer = {
      $$typeof: REACT_CONSUMER_TYPE,
      _context: defaultValue
    };
    return defaultValue;
  };
  react_production.createElement = function(type, config, children) {
    var propName, props = {}, key = null;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
    var childrenLength = arguments.length - 2;
    if (1 === childrenLength) props.children = children;
    else if (1 < childrenLength) {
      for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    if (type && type.defaultProps)
      for (propName in childrenLength = type.defaultProps, childrenLength)
        void 0 === props[propName] && (props[propName] = childrenLength[propName]);
    return ReactElement(type, key, props);
  };
  react_production.createRef = function() {
    return { current: null };
  };
  react_production.forwardRef = function(render) {
    return { $$typeof: REACT_FORWARD_REF_TYPE, render };
  };
  react_production.isValidElement = isValidElement;
  react_production.lazy = function(ctor) {
    return {
      $$typeof: REACT_LAZY_TYPE,
      _payload: { _status: -1, _result: ctor },
      _init: lazyInitializer
    };
  };
  react_production.memo = function(type, compare) {
    return {
      $$typeof: REACT_MEMO_TYPE,
      type,
      compare: void 0 === compare ? null : compare
    };
  };
  react_production.startTransition = function(scope) {
    var prevTransition = ReactSharedInternals.T, currentTransition = {};
    ReactSharedInternals.T = currentTransition;
    try {
      var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
      "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
    } catch (error) {
      reportGlobalError(error);
    } finally {
      null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
    }
  };
  react_production.unstable_useCacheRefresh = function() {
    return ReactSharedInternals.H.useCacheRefresh();
  };
  react_production.use = function(usable) {
    return ReactSharedInternals.H.use(usable);
  };
  react_production.useActionState = function(action, initialState, permalink) {
    return ReactSharedInternals.H.useActionState(action, initialState, permalink);
  };
  react_production.useCallback = function(callback, deps) {
    return ReactSharedInternals.H.useCallback(callback, deps);
  };
  react_production.useContext = function(Context) {
    return ReactSharedInternals.H.useContext(Context);
  };
  react_production.useDebugValue = function() {
  };
  react_production.useDeferredValue = function(value, initialValue) {
    return ReactSharedInternals.H.useDeferredValue(value, initialValue);
  };
  react_production.useEffect = function(create, deps) {
    return ReactSharedInternals.H.useEffect(create, deps);
  };
  react_production.useEffectEvent = function(callback) {
    return ReactSharedInternals.H.useEffectEvent(callback);
  };
  react_production.useId = function() {
    return ReactSharedInternals.H.useId();
  };
  react_production.useImperativeHandle = function(ref, create, deps) {
    return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
  };
  react_production.useInsertionEffect = function(create, deps) {
    return ReactSharedInternals.H.useInsertionEffect(create, deps);
  };
  react_production.useLayoutEffect = function(create, deps) {
    return ReactSharedInternals.H.useLayoutEffect(create, deps);
  };
  react_production.useMemo = function(create, deps) {
    return ReactSharedInternals.H.useMemo(create, deps);
  };
  react_production.useOptimistic = function(passthrough, reducer) {
    return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
  };
  react_production.useReducer = function(reducer, initialArg, init) {
    return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
  };
  react_production.useRef = function(initialValue) {
    return ReactSharedInternals.H.useRef(initialValue);
  };
  react_production.useState = function(initialState) {
    return ReactSharedInternals.H.useState(initialState);
  };
  react_production.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
    return ReactSharedInternals.H.useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    );
  };
  react_production.useTransition = function() {
    return ReactSharedInternals.H.useTransition();
  };
  react_production.version = "19.2.5";
  return react_production;
}
var hasRequiredReact;
function requireReact() {
  if (hasRequiredReact) return react.exports;
  hasRequiredReact = 1;
  {
    react.exports = requireReact_production();
  }
  return react.exports;
}
var reactExports = requireReact();
const React = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
var client = { exports: {} };
var reactDomClient_production = {};
var scheduler = { exports: {} };
var scheduler_production = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredScheduler_production;
function requireScheduler_production() {
  if (hasRequiredScheduler_production) return scheduler_production;
  hasRequiredScheduler_production = 1;
  (function(exports$1) {
    function push(heap, node) {
      var index = heap.length;
      heap.push(node);
      a: for (; 0 < index; ) {
        var parentIndex = index - 1 >>> 1, parent = heap[parentIndex];
        if (0 < compare(parent, node))
          heap[parentIndex] = node, heap[index] = parent, index = parentIndex;
        else break a;
      }
    }
    function peek(heap) {
      return 0 === heap.length ? null : heap[0];
    }
    function pop(heap) {
      if (0 === heap.length) return null;
      var first = heap[0], last = heap.pop();
      if (last !== first) {
        heap[0] = last;
        a: for (var index = 0, length = heap.length, halfLength = length >>> 1; index < halfLength; ) {
          var leftIndex = 2 * (index + 1) - 1, left = heap[leftIndex], rightIndex = leftIndex + 1, right = heap[rightIndex];
          if (0 > compare(left, last))
            rightIndex < length && 0 > compare(right, left) ? (heap[index] = right, heap[rightIndex] = last, index = rightIndex) : (heap[index] = left, heap[leftIndex] = last, index = leftIndex);
          else if (rightIndex < length && 0 > compare(right, last))
            heap[index] = right, heap[rightIndex] = last, index = rightIndex;
          else break a;
        }
      }
      return first;
    }
    function compare(a, b) {
      var diff = a.sortIndex - b.sortIndex;
      return 0 !== diff ? diff : a.id - b.id;
    }
    exports$1.unstable_now = void 0;
    if ("object" === typeof performance && "function" === typeof performance.now) {
      var localPerformance = performance;
      exports$1.unstable_now = function() {
        return localPerformance.now();
      };
    } else {
      var localDate = Date, initialTime = localDate.now();
      exports$1.unstable_now = function() {
        return localDate.now() - initialTime;
      };
    }
    var taskQueue = [], timerQueue = [], taskIdCounter = 1, currentTask = null, currentPriorityLevel = 3, isPerformingWork = false, isHostCallbackScheduled = false, isHostTimeoutScheduled = false, needsPaint = false, localSetTimeout = "function" === typeof setTimeout ? setTimeout : null, localClearTimeout = "function" === typeof clearTimeout ? clearTimeout : null, localSetImmediate = "undefined" !== typeof setImmediate ? setImmediate : null;
    function advanceTimers(currentTime) {
      for (var timer = peek(timerQueue); null !== timer; ) {
        if (null === timer.callback) pop(timerQueue);
        else if (timer.startTime <= currentTime)
          pop(timerQueue), timer.sortIndex = timer.expirationTime, push(taskQueue, timer);
        else break;
        timer = peek(timerQueue);
      }
    }
    function handleTimeout(currentTime) {
      isHostTimeoutScheduled = false;
      advanceTimers(currentTime);
      if (!isHostCallbackScheduled)
        if (null !== peek(taskQueue))
          isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline());
        else {
          var firstTimer = peek(timerQueue);
          null !== firstTimer && requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
    }
    var isMessageLoopRunning = false, taskTimeoutID = -1, frameInterval = 5, startTime = -1;
    function shouldYieldToHost() {
      return needsPaint ? true : exports$1.unstable_now() - startTime < frameInterval ? false : true;
    }
    function performWorkUntilDeadline() {
      needsPaint = false;
      if (isMessageLoopRunning) {
        var currentTime = exports$1.unstable_now();
        startTime = currentTime;
        var hasMoreWork = true;
        try {
          a: {
            isHostCallbackScheduled = false;
            isHostTimeoutScheduled && (isHostTimeoutScheduled = false, localClearTimeout(taskTimeoutID), taskTimeoutID = -1);
            isPerformingWork = true;
            var previousPriorityLevel = currentPriorityLevel;
            try {
              b: {
                advanceTimers(currentTime);
                for (currentTask = peek(taskQueue); null !== currentTask && !(currentTask.expirationTime > currentTime && shouldYieldToHost()); ) {
                  var callback = currentTask.callback;
                  if ("function" === typeof callback) {
                    currentTask.callback = null;
                    currentPriorityLevel = currentTask.priorityLevel;
                    var continuationCallback = callback(
                      currentTask.expirationTime <= currentTime
                    );
                    currentTime = exports$1.unstable_now();
                    if ("function" === typeof continuationCallback) {
                      currentTask.callback = continuationCallback;
                      advanceTimers(currentTime);
                      hasMoreWork = true;
                      break b;
                    }
                    currentTask === peek(taskQueue) && pop(taskQueue);
                    advanceTimers(currentTime);
                  } else pop(taskQueue);
                  currentTask = peek(taskQueue);
                }
                if (null !== currentTask) hasMoreWork = true;
                else {
                  var firstTimer = peek(timerQueue);
                  null !== firstTimer && requestHostTimeout(
                    handleTimeout,
                    firstTimer.startTime - currentTime
                  );
                  hasMoreWork = false;
                }
              }
              break a;
            } finally {
              currentTask = null, currentPriorityLevel = previousPriorityLevel, isPerformingWork = false;
            }
            hasMoreWork = void 0;
          }
        } finally {
          hasMoreWork ? schedulePerformWorkUntilDeadline() : isMessageLoopRunning = false;
        }
      }
    }
    var schedulePerformWorkUntilDeadline;
    if ("function" === typeof localSetImmediate)
      schedulePerformWorkUntilDeadline = function() {
        localSetImmediate(performWorkUntilDeadline);
      };
    else if ("undefined" !== typeof MessageChannel) {
      var channel = new MessageChannel(), port = channel.port2;
      channel.port1.onmessage = performWorkUntilDeadline;
      schedulePerformWorkUntilDeadline = function() {
        port.postMessage(null);
      };
    } else
      schedulePerformWorkUntilDeadline = function() {
        localSetTimeout(performWorkUntilDeadline, 0);
      };
    function requestHostTimeout(callback, ms) {
      taskTimeoutID = localSetTimeout(function() {
        callback(exports$1.unstable_now());
      }, ms);
    }
    exports$1.unstable_IdlePriority = 5;
    exports$1.unstable_ImmediatePriority = 1;
    exports$1.unstable_LowPriority = 4;
    exports$1.unstable_NormalPriority = 3;
    exports$1.unstable_Profiling = null;
    exports$1.unstable_UserBlockingPriority = 2;
    exports$1.unstable_cancelCallback = function(task) {
      task.callback = null;
    };
    exports$1.unstable_forceFrameRate = function(fps) {
      0 > fps || 125 < fps ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : frameInterval = 0 < fps ? Math.floor(1e3 / fps) : 5;
    };
    exports$1.unstable_getCurrentPriorityLevel = function() {
      return currentPriorityLevel;
    };
    exports$1.unstable_next = function(eventHandler) {
      switch (currentPriorityLevel) {
        case 1:
        case 2:
        case 3:
          var priorityLevel = 3;
          break;
        default:
          priorityLevel = currentPriorityLevel;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports$1.unstable_requestPaint = function() {
      needsPaint = true;
    };
    exports$1.unstable_runWithPriority = function(priorityLevel, eventHandler) {
      switch (priorityLevel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          priorityLevel = 3;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports$1.unstable_scheduleCallback = function(priorityLevel, callback, options) {
      var currentTime = exports$1.unstable_now();
      "object" === typeof options && null !== options ? (options = options.delay, options = "number" === typeof options && 0 < options ? currentTime + options : currentTime) : options = currentTime;
      switch (priorityLevel) {
        case 1:
          var timeout = -1;
          break;
        case 2:
          timeout = 250;
          break;
        case 5:
          timeout = 1073741823;
          break;
        case 4:
          timeout = 1e4;
          break;
        default:
          timeout = 5e3;
      }
      timeout = options + timeout;
      priorityLevel = {
        id: taskIdCounter++,
        callback,
        priorityLevel,
        startTime: options,
        expirationTime: timeout,
        sortIndex: -1
      };
      options > currentTime ? (priorityLevel.sortIndex = options, push(timerQueue, priorityLevel), null === peek(taskQueue) && priorityLevel === peek(timerQueue) && (isHostTimeoutScheduled ? (localClearTimeout(taskTimeoutID), taskTimeoutID = -1) : isHostTimeoutScheduled = true, requestHostTimeout(handleTimeout, options - currentTime))) : (priorityLevel.sortIndex = timeout, push(taskQueue, priorityLevel), isHostCallbackScheduled || isPerformingWork || (isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline())));
      return priorityLevel;
    };
    exports$1.unstable_shouldYield = shouldYieldToHost;
    exports$1.unstable_wrapCallback = function(callback) {
      var parentPriorityLevel = currentPriorityLevel;
      return function() {
        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = parentPriorityLevel;
        try {
          return callback.apply(this, arguments);
        } finally {
          currentPriorityLevel = previousPriorityLevel;
        }
      };
    };
  })(scheduler_production);
  return scheduler_production;
}
var hasRequiredScheduler;
function requireScheduler() {
  if (hasRequiredScheduler) return scheduler.exports;
  hasRequiredScheduler = 1;
  {
    scheduler.exports = requireScheduler_production();
  }
  return scheduler.exports;
}
var reactDom = { exports: {} };
var reactDom_production = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactDom_production;
function requireReactDom_production() {
  if (hasRequiredReactDom_production) return reactDom_production;
  hasRequiredReactDom_production = 1;
  var React2 = requireReact();
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function noop() {
  }
  var Internals = {
    d: {
      f: noop,
      r: function() {
        throw Error(formatProdErrorMessage(522));
      },
      D: noop,
      C: noop,
      L: noop,
      m: noop,
      X: noop,
      S: noop,
      M: noop
    },
    p: 0,
    findDOMNode: null
  }, REACT_PORTAL_TYPE = Symbol.for("react.portal");
  function createPortal$1(children, containerInfo, implementation) {
    var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
    return {
      $$typeof: REACT_PORTAL_TYPE,
      key: null == key ? null : "" + key,
      children,
      containerInfo,
      implementation
    };
  }
  var ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function getCrossOriginStringAs(as, input) {
    if ("font" === as) return "";
    if ("string" === typeof input)
      return "use-credentials" === input ? input : "";
  }
  reactDom_production.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
  reactDom_production.createPortal = function(children, container) {
    var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
    if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
      throw Error(formatProdErrorMessage(299));
    return createPortal$1(children, container, null, key);
  };
  reactDom_production.flushSync = function(fn) {
    var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
    try {
      if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
    } finally {
      ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
    }
  };
  reactDom_production.preconnect = function(href, options) {
    "string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
  };
  reactDom_production.prefetchDNS = function(href) {
    "string" === typeof href && Internals.d.D(href);
  };
  reactDom_production.preinit = function(href, options) {
    if ("string" === typeof href && options && "string" === typeof options.as) {
      var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
      "style" === as ? Internals.d.S(
        href,
        "string" === typeof options.precedence ? options.precedence : void 0,
        {
          crossOrigin,
          integrity,
          fetchPriority
        }
      ) : "script" === as && Internals.d.X(href, {
        crossOrigin,
        integrity,
        fetchPriority,
        nonce: "string" === typeof options.nonce ? options.nonce : void 0
      });
    }
  };
  reactDom_production.preinitModule = function(href, options) {
    if ("string" === typeof href)
      if ("object" === typeof options && null !== options) {
        if (null == options.as || "script" === options.as) {
          var crossOrigin = getCrossOriginStringAs(
            options.as,
            options.crossOrigin
          );
          Internals.d.M(href, {
            crossOrigin,
            integrity: "string" === typeof options.integrity ? options.integrity : void 0,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0
          });
        }
      } else null == options && Internals.d.M(href);
  };
  reactDom_production.preload = function(href, options) {
    if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
      var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
      Internals.d.L(href, as, {
        crossOrigin,
        integrity: "string" === typeof options.integrity ? options.integrity : void 0,
        nonce: "string" === typeof options.nonce ? options.nonce : void 0,
        type: "string" === typeof options.type ? options.type : void 0,
        fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
        referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
        imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
        imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
        media: "string" === typeof options.media ? options.media : void 0
      });
    }
  };
  reactDom_production.preloadModule = function(href, options) {
    if ("string" === typeof href)
      if (options) {
        var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
        Internals.d.m(href, {
          as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
          crossOrigin,
          integrity: "string" === typeof options.integrity ? options.integrity : void 0
        });
      } else Internals.d.m(href);
  };
  reactDom_production.requestFormReset = function(form) {
    Internals.d.r(form);
  };
  reactDom_production.unstable_batchedUpdates = function(fn, a) {
    return fn(a);
  };
  reactDom_production.useFormState = function(action, initialState, permalink) {
    return ReactSharedInternals.H.useFormState(action, initialState, permalink);
  };
  reactDom_production.useFormStatus = function() {
    return ReactSharedInternals.H.useHostTransitionStatus();
  };
  reactDom_production.version = "19.2.5";
  return reactDom_production;
}
var hasRequiredReactDom;
function requireReactDom() {
  if (hasRequiredReactDom) return reactDom.exports;
  hasRequiredReactDom = 1;
  function checkDCE() {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
      return;
    }
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
      console.error(err);
    }
  }
  {
    checkDCE();
    reactDom.exports = requireReactDom_production();
  }
  return reactDom.exports;
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactDomClient_production;
function requireReactDomClient_production() {
  if (hasRequiredReactDomClient_production) return reactDomClient_production;
  hasRequiredReactDomClient_production = 1;
  var Scheduler = requireScheduler(), React2 = requireReact(), ReactDOM2 = requireReactDom();
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function isValidContainer(node) {
    return !(!node || 1 !== node.nodeType && 9 !== node.nodeType && 11 !== node.nodeType);
  }
  function getNearestMountedFiber(fiber) {
    var node = fiber, nearestMounted = fiber;
    if (fiber.alternate) for (; node.return; ) node = node.return;
    else {
      fiber = node;
      do
        node = fiber, 0 !== (node.flags & 4098) && (nearestMounted = node.return), fiber = node.return;
      while (fiber);
    }
    return 3 === node.tag ? nearestMounted : null;
  }
  function getSuspenseInstanceFromFiber(fiber) {
    if (13 === fiber.tag) {
      var suspenseState = fiber.memoizedState;
      null === suspenseState && (fiber = fiber.alternate, null !== fiber && (suspenseState = fiber.memoizedState));
      if (null !== suspenseState) return suspenseState.dehydrated;
    }
    return null;
  }
  function getActivityInstanceFromFiber(fiber) {
    if (31 === fiber.tag) {
      var activityState = fiber.memoizedState;
      null === activityState && (fiber = fiber.alternate, null !== fiber && (activityState = fiber.memoizedState));
      if (null !== activityState) return activityState.dehydrated;
    }
    return null;
  }
  function assertIsMounted(fiber) {
    if (getNearestMountedFiber(fiber) !== fiber)
      throw Error(formatProdErrorMessage(188));
  }
  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;
    if (!alternate) {
      alternate = getNearestMountedFiber(fiber);
      if (null === alternate) throw Error(formatProdErrorMessage(188));
      return alternate !== fiber ? null : fiber;
    }
    for (var a = fiber, b = alternate; ; ) {
      var parentA = a.return;
      if (null === parentA) break;
      var parentB = parentA.alternate;
      if (null === parentB) {
        b = parentA.return;
        if (null !== b) {
          a = b;
          continue;
        }
        break;
      }
      if (parentA.child === parentB.child) {
        for (parentB = parentA.child; parentB; ) {
          if (parentB === a) return assertIsMounted(parentA), fiber;
          if (parentB === b) return assertIsMounted(parentA), alternate;
          parentB = parentB.sibling;
        }
        throw Error(formatProdErrorMessage(188));
      }
      if (a.return !== b.return) a = parentA, b = parentB;
      else {
        for (var didFindChild = false, child$0 = parentA.child; child$0; ) {
          if (child$0 === a) {
            didFindChild = true;
            a = parentA;
            b = parentB;
            break;
          }
          if (child$0 === b) {
            didFindChild = true;
            b = parentA;
            a = parentB;
            break;
          }
          child$0 = child$0.sibling;
        }
        if (!didFindChild) {
          for (child$0 = parentB.child; child$0; ) {
            if (child$0 === a) {
              didFindChild = true;
              a = parentB;
              b = parentA;
              break;
            }
            if (child$0 === b) {
              didFindChild = true;
              b = parentB;
              a = parentA;
              break;
            }
            child$0 = child$0.sibling;
          }
          if (!didFindChild) throw Error(formatProdErrorMessage(189));
        }
      }
      if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
    }
    if (3 !== a.tag) throw Error(formatProdErrorMessage(188));
    return a.stateNode.current === a ? fiber : alternate;
  }
  function findCurrentHostFiberImpl(node) {
    var tag = node.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
    for (node = node.child; null !== node; ) {
      tag = findCurrentHostFiberImpl(node);
      if (null !== tag) return tag;
      node = node.sibling;
    }
    return null;
  }
  var assign = Object.assign, REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy");
  var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
  var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
  var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
  function getComponentNameFromType(type) {
    if (null == type) return null;
    if ("function" === typeof type)
      return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
    if ("string" === typeof type) return type;
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return "Fragment";
      case REACT_PROFILER_TYPE:
        return "Profiler";
      case REACT_STRICT_MODE_TYPE:
        return "StrictMode";
      case REACT_SUSPENSE_TYPE:
        return "Suspense";
      case REACT_SUSPENSE_LIST_TYPE:
        return "SuspenseList";
      case REACT_ACTIVITY_TYPE:
        return "Activity";
    }
    if ("object" === typeof type)
      switch (type.$$typeof) {
        case REACT_PORTAL_TYPE:
          return "Portal";
        case REACT_CONTEXT_TYPE:
          return type.displayName || "Context";
        case REACT_CONSUMER_TYPE:
          return (type._context.displayName || "Context") + ".Consumer";
        case REACT_FORWARD_REF_TYPE:
          var innerType = type.render;
          type = type.displayName;
          type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
          return type;
        case REACT_MEMO_TYPE:
          return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
        case REACT_LAZY_TYPE:
          innerType = type._payload;
          type = type._init;
          try {
            return getComponentNameFromType(type(innerType));
          } catch (x) {
          }
      }
    return null;
  }
  var isArrayImpl = Array.isArray, ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ReactDOMSharedInternals = ReactDOM2.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, sharedNotPendingObject = {
    pending: false,
    data: null,
    method: null,
    action: null
  }, valueStack = [], index = -1;
  function createCursor(defaultValue) {
    return { current: defaultValue };
  }
  function pop(cursor) {
    0 > index || (cursor.current = valueStack[index], valueStack[index] = null, index--);
  }
  function push(cursor, value) {
    index++;
    valueStack[index] = cursor.current;
    cursor.current = value;
  }
  var contextStackCursor = createCursor(null), contextFiberStackCursor = createCursor(null), rootInstanceStackCursor = createCursor(null), hostTransitionProviderCursor = createCursor(null);
  function pushHostContainer(fiber, nextRootInstance) {
    push(rootInstanceStackCursor, nextRootInstance);
    push(contextFiberStackCursor, fiber);
    push(contextStackCursor, null);
    switch (nextRootInstance.nodeType) {
      case 9:
      case 11:
        fiber = (fiber = nextRootInstance.documentElement) ? (fiber = fiber.namespaceURI) ? getOwnHostContext(fiber) : 0 : 0;
        break;
      default:
        if (fiber = nextRootInstance.tagName, nextRootInstance = nextRootInstance.namespaceURI)
          nextRootInstance = getOwnHostContext(nextRootInstance), fiber = getChildHostContextProd(nextRootInstance, fiber);
        else
          switch (fiber) {
            case "svg":
              fiber = 1;
              break;
            case "math":
              fiber = 2;
              break;
            default:
              fiber = 0;
          }
    }
    pop(contextStackCursor);
    push(contextStackCursor, fiber);
  }
  function popHostContainer() {
    pop(contextStackCursor);
    pop(contextFiberStackCursor);
    pop(rootInstanceStackCursor);
  }
  function pushHostContext(fiber) {
    null !== fiber.memoizedState && push(hostTransitionProviderCursor, fiber);
    var context = contextStackCursor.current;
    var JSCompiler_inline_result = getChildHostContextProd(context, fiber.type);
    context !== JSCompiler_inline_result && (push(contextFiberStackCursor, fiber), push(contextStackCursor, JSCompiler_inline_result));
  }
  function popHostContext(fiber) {
    contextFiberStackCursor.current === fiber && (pop(contextStackCursor), pop(contextFiberStackCursor));
    hostTransitionProviderCursor.current === fiber && (pop(hostTransitionProviderCursor), HostTransitionContext._currentValue = sharedNotPendingObject);
  }
  var prefix, suffix;
  function describeBuiltInComponentFrame(name) {
    if (void 0 === prefix)
      try {
        throw Error();
      } catch (x) {
        var match = x.stack.trim().match(/\n( *(at )?)/);
        prefix = match && match[1] || "";
        suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return "\n" + prefix + name + suffix;
  }
  var reentry = false;
  function describeNativeComponentFrame(fn, construct) {
    if (!fn || reentry) return "";
    reentry = true;
    var previousPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var RunInRootFrame = {
        DetermineComponentFrameRoot: function() {
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if ("object" === typeof Reflect && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  var control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x$1) {
                  control = x$1;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x$2) {
                control = x$2;
              }
              (Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {
              });
            }
          } catch (sample) {
            if (sample && control && "string" === typeof sample.stack)
              return [sample.stack, control.stack];
          }
          return [null, null];
        }
      };
      RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var namePropDescriptor = Object.getOwnPropertyDescriptor(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name"
      );
      namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
      if (sampleStack && controlStack) {
        var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
        for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot"); )
          RunInRootFrame++;
        for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        ); )
          namePropDescriptor++;
        if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length)
          for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]; )
            namePropDescriptor--;
        for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--)
          if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
            if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
              do
                if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
                  var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
                  fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
                  return frame;
                }
              while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
            }
            break;
          }
      }
    } finally {
      reentry = false, Error.prepareStackTrace = previousPrepareStackTrace;
    }
    return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
  }
  function describeFiber(fiber, childFiber) {
    switch (fiber.tag) {
      case 26:
      case 27:
      case 5:
        return describeBuiltInComponentFrame(fiber.type);
      case 16:
        return describeBuiltInComponentFrame("Lazy");
      case 13:
        return fiber.child !== childFiber && null !== childFiber ? describeBuiltInComponentFrame("Suspense Fallback") : describeBuiltInComponentFrame("Suspense");
      case 19:
        return describeBuiltInComponentFrame("SuspenseList");
      case 0:
      case 15:
        return describeNativeComponentFrame(fiber.type, false);
      case 11:
        return describeNativeComponentFrame(fiber.type.render, false);
      case 1:
        return describeNativeComponentFrame(fiber.type, true);
      case 31:
        return describeBuiltInComponentFrame("Activity");
      default:
        return "";
    }
  }
  function getStackByFiberInDevAndProd(workInProgress2) {
    try {
      var info = "", previous = null;
      do
        info += describeFiber(workInProgress2, previous), previous = workInProgress2, workInProgress2 = workInProgress2.return;
      while (workInProgress2);
      return info;
    } catch (x) {
      return "\nError generating stack: " + x.message + "\n" + x.stack;
    }
  }
  var hasOwnProperty = Object.prototype.hasOwnProperty, scheduleCallback$3 = Scheduler.unstable_scheduleCallback, cancelCallback$1 = Scheduler.unstable_cancelCallback, shouldYield = Scheduler.unstable_shouldYield, requestPaint = Scheduler.unstable_requestPaint, now = Scheduler.unstable_now, getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel, ImmediatePriority = Scheduler.unstable_ImmediatePriority, UserBlockingPriority = Scheduler.unstable_UserBlockingPriority, NormalPriority$1 = Scheduler.unstable_NormalPriority, LowPriority = Scheduler.unstable_LowPriority, IdlePriority = Scheduler.unstable_IdlePriority, log$1 = Scheduler.log, unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue, rendererID = null, injectedHook = null;
  function setIsStrictModeForDevtools(newIsStrictMode) {
    "function" === typeof log$1 && unstable_setDisableYieldValue(newIsStrictMode);
    if (injectedHook && "function" === typeof injectedHook.setStrictMode)
      try {
        injectedHook.setStrictMode(rendererID, newIsStrictMode);
      } catch (err) {
      }
  }
  var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback, log = Math.log, LN2 = Math.LN2;
  function clz32Fallback(x) {
    x >>>= 0;
    return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
  }
  var nextTransitionUpdateLane = 256, nextTransitionDeferredLane = 262144, nextRetryLane = 4194304;
  function getHighestPriorityLanes(lanes) {
    var pendingSyncLanes = lanes & 42;
    if (0 !== pendingSyncLanes) return pendingSyncLanes;
    switch (lanes & -lanes) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return lanes & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return lanes & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return lanes & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return lanes;
    }
  }
  function getNextLanes(root2, wipLanes, rootHasPendingCommit) {
    var pendingLanes = root2.pendingLanes;
    if (0 === pendingLanes) return 0;
    var nextLanes = 0, suspendedLanes = root2.suspendedLanes, pingedLanes = root2.pingedLanes;
    root2 = root2.warmLanes;
    var nonIdlePendingLanes = pendingLanes & 134217727;
    0 !== nonIdlePendingLanes ? (pendingLanes = nonIdlePendingLanes & ~suspendedLanes, 0 !== pendingLanes ? nextLanes = getHighestPriorityLanes(pendingLanes) : (pingedLanes &= nonIdlePendingLanes, 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = nonIdlePendingLanes & ~root2, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))))) : (nonIdlePendingLanes = pendingLanes & ~suspendedLanes, 0 !== nonIdlePendingLanes ? nextLanes = getHighestPriorityLanes(nonIdlePendingLanes) : 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = pendingLanes & ~root2, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
    return 0 === nextLanes ? 0 : 0 !== wipLanes && wipLanes !== nextLanes && 0 === (wipLanes & suspendedLanes) && (suspendedLanes = nextLanes & -nextLanes, rootHasPendingCommit = wipLanes & -wipLanes, suspendedLanes >= rootHasPendingCommit || 32 === suspendedLanes && 0 !== (rootHasPendingCommit & 4194048)) ? wipLanes : nextLanes;
  }
  function checkIfRootIsPrerendering(root2, renderLanes2) {
    return 0 === (root2.pendingLanes & ~(root2.suspendedLanes & ~root2.pingedLanes) & renderLanes2);
  }
  function computeExpirationTime(lane, currentTime) {
    switch (lane) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return currentTime + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return currentTime + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function claimNextRetryLane() {
    var lane = nextRetryLane;
    nextRetryLane <<= 1;
    0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
    return lane;
  }
  function createLaneMap(initial) {
    for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
    return laneMap;
  }
  function markRootUpdated$1(root2, updateLane) {
    root2.pendingLanes |= updateLane;
    268435456 !== updateLane && (root2.suspendedLanes = 0, root2.pingedLanes = 0, root2.warmLanes = 0);
  }
  function markRootFinished(root2, finishedLanes, remainingLanes, spawnedLane, updatedLanes, suspendedRetryLanes) {
    var previouslyPendingLanes = root2.pendingLanes;
    root2.pendingLanes = remainingLanes;
    root2.suspendedLanes = 0;
    root2.pingedLanes = 0;
    root2.warmLanes = 0;
    root2.expiredLanes &= remainingLanes;
    root2.entangledLanes &= remainingLanes;
    root2.errorRecoveryDisabledLanes &= remainingLanes;
    root2.shellSuspendCounter = 0;
    var entanglements = root2.entanglements, expirationTimes = root2.expirationTimes, hiddenUpdates = root2.hiddenUpdates;
    for (remainingLanes = previouslyPendingLanes & ~remainingLanes; 0 < remainingLanes; ) {
      var index$7 = 31 - clz32(remainingLanes), lane = 1 << index$7;
      entanglements[index$7] = 0;
      expirationTimes[index$7] = -1;
      var hiddenUpdatesForLane = hiddenUpdates[index$7];
      if (null !== hiddenUpdatesForLane)
        for (hiddenUpdates[index$7] = null, index$7 = 0; index$7 < hiddenUpdatesForLane.length; index$7++) {
          var update = hiddenUpdatesForLane[index$7];
          null !== update && (update.lane &= -536870913);
        }
      remainingLanes &= ~lane;
    }
    0 !== spawnedLane && markSpawnedDeferredLane(root2, spawnedLane, 0);
    0 !== suspendedRetryLanes && 0 === updatedLanes && 0 !== root2.tag && (root2.suspendedLanes |= suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
  }
  function markSpawnedDeferredLane(root2, spawnedLane, entangledLanes) {
    root2.pendingLanes |= spawnedLane;
    root2.suspendedLanes &= ~spawnedLane;
    var spawnedLaneIndex = 31 - clz32(spawnedLane);
    root2.entangledLanes |= spawnedLane;
    root2.entanglements[spawnedLaneIndex] = root2.entanglements[spawnedLaneIndex] | 1073741824 | entangledLanes & 261930;
  }
  function markRootEntangled(root2, entangledLanes) {
    var rootEntangledLanes = root2.entangledLanes |= entangledLanes;
    for (root2 = root2.entanglements; rootEntangledLanes; ) {
      var index$8 = 31 - clz32(rootEntangledLanes), lane = 1 << index$8;
      lane & entangledLanes | root2[index$8] & entangledLanes && (root2[index$8] |= entangledLanes);
      rootEntangledLanes &= ~lane;
    }
  }
  function getBumpedLaneForHydration(root2, renderLanes2) {
    var renderLane = renderLanes2 & -renderLanes2;
    renderLane = 0 !== (renderLane & 42) ? 1 : getBumpedLaneForHydrationByLane(renderLane);
    return 0 !== (renderLane & (root2.suspendedLanes | renderLanes2)) ? 0 : renderLane;
  }
  function getBumpedLaneForHydrationByLane(lane) {
    switch (lane) {
      case 2:
        lane = 1;
        break;
      case 8:
        lane = 4;
        break;
      case 32:
        lane = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        lane = 128;
        break;
      case 268435456:
        lane = 134217728;
        break;
      default:
        lane = 0;
    }
    return lane;
  }
  function lanesToEventPriority(lanes) {
    lanes &= -lanes;
    return 2 < lanes ? 8 < lanes ? 0 !== (lanes & 134217727) ? 32 : 268435456 : 8 : 2;
  }
  function resolveUpdatePriority() {
    var updatePriority = ReactDOMSharedInternals.p;
    if (0 !== updatePriority) return updatePriority;
    updatePriority = window.event;
    return void 0 === updatePriority ? 32 : getEventPriority(updatePriority.type);
  }
  function runWithPriority(priority, fn) {
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      return ReactDOMSharedInternals.p = priority, fn();
    } finally {
      ReactDOMSharedInternals.p = previousPriority;
    }
  }
  var randomKey = Math.random().toString(36).slice(2), internalInstanceKey = "__reactFiber$" + randomKey, internalPropsKey = "__reactProps$" + randomKey, internalContainerInstanceKey = "__reactContainer$" + randomKey, internalEventHandlersKey = "__reactEvents$" + randomKey, internalEventHandlerListenersKey = "__reactListeners$" + randomKey, internalEventHandlesSetKey = "__reactHandles$" + randomKey, internalRootNodeResourcesKey = "__reactResources$" + randomKey, internalHoistableMarker = "__reactMarker$" + randomKey;
  function detachDeletedInstance(node) {
    delete node[internalInstanceKey];
    delete node[internalPropsKey];
    delete node[internalEventHandlersKey];
    delete node[internalEventHandlerListenersKey];
    delete node[internalEventHandlesSetKey];
  }
  function getClosestInstanceFromNode(targetNode) {
    var targetInst = targetNode[internalInstanceKey];
    if (targetInst) return targetInst;
    for (var parentNode = targetNode.parentNode; parentNode; ) {
      if (targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey]) {
        parentNode = targetInst.alternate;
        if (null !== targetInst.child || null !== parentNode && null !== parentNode.child)
          for (targetNode = getParentHydrationBoundary(targetNode); null !== targetNode; ) {
            if (parentNode = targetNode[internalInstanceKey]) return parentNode;
            targetNode = getParentHydrationBoundary(targetNode);
          }
        return targetInst;
      }
      targetNode = parentNode;
      parentNode = targetNode.parentNode;
    }
    return null;
  }
  function getInstanceFromNode(node) {
    if (node = node[internalInstanceKey] || node[internalContainerInstanceKey]) {
      var tag = node.tag;
      if (5 === tag || 6 === tag || 13 === tag || 31 === tag || 26 === tag || 27 === tag || 3 === tag)
        return node;
    }
    return null;
  }
  function getNodeFromInstance(inst) {
    var tag = inst.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return inst.stateNode;
    throw Error(formatProdErrorMessage(33));
  }
  function getResourcesFromRoot(root2) {
    var resources = root2[internalRootNodeResourcesKey];
    resources || (resources = root2[internalRootNodeResourcesKey] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() });
    return resources;
  }
  function markNodeAsHoistable(node) {
    node[internalHoistableMarker] = true;
  }
  var allNativeEvents = /* @__PURE__ */ new Set(), registrationNameDependencies = {};
  function registerTwoPhaseEvent(registrationName, dependencies) {
    registerDirectEvent(registrationName, dependencies);
    registerDirectEvent(registrationName + "Capture", dependencies);
  }
  function registerDirectEvent(registrationName, dependencies) {
    registrationNameDependencies[registrationName] = dependencies;
    for (registrationName = 0; registrationName < dependencies.length; registrationName++)
      allNativeEvents.add(dependencies[registrationName]);
  }
  var VALID_ATTRIBUTE_NAME_REGEX = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), illegalAttributeNameCache = {}, validatedAttributeNameCache = {};
  function isAttributeNameSafe(attributeName) {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
      return true;
    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return false;
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
      return validatedAttributeNameCache[attributeName] = true;
    illegalAttributeNameCache[attributeName] = true;
    return false;
  }
  function setValueForAttribute(node, name, value) {
    if (isAttributeNameSafe(name))
      if (null === value) node.removeAttribute(name);
      else {
        switch (typeof value) {
          case "undefined":
          case "function":
          case "symbol":
            node.removeAttribute(name);
            return;
          case "boolean":
            var prefix$10 = name.toLowerCase().slice(0, 5);
            if ("data-" !== prefix$10 && "aria-" !== prefix$10) {
              node.removeAttribute(name);
              return;
            }
        }
        node.setAttribute(name, "" + value);
      }
  }
  function setValueForKnownAttribute(node, name, value) {
    if (null === value) node.removeAttribute(name);
    else {
      switch (typeof value) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          node.removeAttribute(name);
          return;
      }
      node.setAttribute(name, "" + value);
    }
  }
  function setValueForNamespacedAttribute(node, namespace, name, value) {
    if (null === value) node.removeAttribute(name);
    else {
      switch (typeof value) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          node.removeAttribute(name);
          return;
      }
      node.setAttributeNS(namespace, name, "" + value);
    }
  }
  function getToStringValue(value) {
    switch (typeof value) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return value;
      case "object":
        return value;
      default:
        return "";
    }
  }
  function isCheckable(elem) {
    var type = elem.type;
    return (elem = elem.nodeName) && "input" === elem.toLowerCase() && ("checkbox" === type || "radio" === type);
  }
  function trackValueOnNode(node, valueField, currentValue) {
    var descriptor = Object.getOwnPropertyDescriptor(
      node.constructor.prototype,
      valueField
    );
    if (!node.hasOwnProperty(valueField) && "undefined" !== typeof descriptor && "function" === typeof descriptor.get && "function" === typeof descriptor.set) {
      var get = descriptor.get, set = descriptor.set;
      Object.defineProperty(node, valueField, {
        configurable: true,
        get: function() {
          return get.call(this);
        },
        set: function(value) {
          currentValue = "" + value;
          set.call(this, value);
        }
      });
      Object.defineProperty(node, valueField, {
        enumerable: descriptor.enumerable
      });
      return {
        getValue: function() {
          return currentValue;
        },
        setValue: function(value) {
          currentValue = "" + value;
        },
        stopTracking: function() {
          node._valueTracker = null;
          delete node[valueField];
        }
      };
    }
  }
  function track(node) {
    if (!node._valueTracker) {
      var valueField = isCheckable(node) ? "checked" : "value";
      node._valueTracker = trackValueOnNode(
        node,
        valueField,
        "" + node[valueField]
      );
    }
  }
  function updateValueIfChanged(node) {
    if (!node) return false;
    var tracker = node._valueTracker;
    if (!tracker) return true;
    var lastValue = tracker.getValue();
    var value = "";
    node && (value = isCheckable(node) ? node.checked ? "true" : "false" : node.value);
    node = value;
    return node !== lastValue ? (tracker.setValue(node), true) : false;
  }
  function getActiveElement(doc) {
    doc = doc || ("undefined" !== typeof document ? document : void 0);
    if ("undefined" === typeof doc) return null;
    try {
      return doc.activeElement || doc.body;
    } catch (e) {
      return doc.body;
    }
  }
  var escapeSelectorAttributeValueInsideDoubleQuotesRegex = /[\n"\\]/g;
  function escapeSelectorAttributeValueInsideDoubleQuotes(value) {
    return value.replace(
      escapeSelectorAttributeValueInsideDoubleQuotesRegex,
      function(ch) {
        return "\\" + ch.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function updateInput(element, value, defaultValue, lastDefaultValue, checked, defaultChecked, type, name) {
    element.name = "";
    null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type ? element.type = type : element.removeAttribute("type");
    if (null != value)
      if ("number" === type) {
        if (0 === value && "" === element.value || element.value != value)
          element.value = "" + getToStringValue(value);
      } else
        element.value !== "" + getToStringValue(value) && (element.value = "" + getToStringValue(value));
    else
      "submit" !== type && "reset" !== type || element.removeAttribute("value");
    null != value ? setDefaultValue(element, type, getToStringValue(value)) : null != defaultValue ? setDefaultValue(element, type, getToStringValue(defaultValue)) : null != lastDefaultValue && element.removeAttribute("value");
    null == checked && null != defaultChecked && (element.defaultChecked = !!defaultChecked);
    null != checked && (element.checked = checked && "function" !== typeof checked && "symbol" !== typeof checked);
    null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name ? element.name = "" + getToStringValue(name) : element.removeAttribute("name");
  }
  function initInput(element, value, defaultValue, checked, defaultChecked, type, name, isHydrating2) {
    null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type && (element.type = type);
    if (null != value || null != defaultValue) {
      if (!("submit" !== type && "reset" !== type || void 0 !== value && null !== value)) {
        track(element);
        return;
      }
      defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
      value = null != value ? "" + getToStringValue(value) : defaultValue;
      isHydrating2 || value === element.value || (element.value = value);
      element.defaultValue = value;
    }
    checked = null != checked ? checked : defaultChecked;
    checked = "function" !== typeof checked && "symbol" !== typeof checked && !!checked;
    element.checked = isHydrating2 ? element.checked : !!checked;
    element.defaultChecked = !!checked;
    null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name && (element.name = name);
    track(element);
  }
  function setDefaultValue(node, type, value) {
    "number" === type && getActiveElement(node.ownerDocument) === node || node.defaultValue === "" + value || (node.defaultValue = "" + value);
  }
  function updateOptions(node, multiple, propValue, setDefaultSelected) {
    node = node.options;
    if (multiple) {
      multiple = {};
      for (var i = 0; i < propValue.length; i++)
        multiple["$" + propValue[i]] = true;
      for (propValue = 0; propValue < node.length; propValue++)
        i = multiple.hasOwnProperty("$" + node[propValue].value), node[propValue].selected !== i && (node[propValue].selected = i), i && setDefaultSelected && (node[propValue].defaultSelected = true);
    } else {
      propValue = "" + getToStringValue(propValue);
      multiple = null;
      for (i = 0; i < node.length; i++) {
        if (node[i].value === propValue) {
          node[i].selected = true;
          setDefaultSelected && (node[i].defaultSelected = true);
          return;
        }
        null !== multiple || node[i].disabled || (multiple = node[i]);
      }
      null !== multiple && (multiple.selected = true);
    }
  }
  function updateTextarea(element, value, defaultValue) {
    if (null != value && (value = "" + getToStringValue(value), value !== element.value && (element.value = value), null == defaultValue)) {
      element.defaultValue !== value && (element.defaultValue = value);
      return;
    }
    element.defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
  }
  function initTextarea(element, value, defaultValue, children) {
    if (null == value) {
      if (null != children) {
        if (null != defaultValue) throw Error(formatProdErrorMessage(92));
        if (isArrayImpl(children)) {
          if (1 < children.length) throw Error(formatProdErrorMessage(93));
          children = children[0];
        }
        defaultValue = children;
      }
      null == defaultValue && (defaultValue = "");
      value = defaultValue;
    }
    defaultValue = getToStringValue(value);
    element.defaultValue = defaultValue;
    children = element.textContent;
    children === defaultValue && "" !== children && null !== children && (element.value = children);
    track(element);
  }
  function setTextContent(node, text) {
    if (text) {
      var firstChild = node.firstChild;
      if (firstChild && firstChild === node.lastChild && 3 === firstChild.nodeType) {
        firstChild.nodeValue = text;
        return;
      }
    }
    node.textContent = text;
  }
  var unitlessNumbers = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function setValueForStyle(style2, styleName, value) {
    var isCustomProperty = 0 === styleName.indexOf("--");
    null == value || "boolean" === typeof value || "" === value ? isCustomProperty ? style2.setProperty(styleName, "") : "float" === styleName ? style2.cssFloat = "" : style2[styleName] = "" : isCustomProperty ? style2.setProperty(styleName, value) : "number" !== typeof value || 0 === value || unitlessNumbers.has(styleName) ? "float" === styleName ? style2.cssFloat = value : style2[styleName] = ("" + value).trim() : style2[styleName] = value + "px";
  }
  function setValueForStyles(node, styles, prevStyles) {
    if (null != styles && "object" !== typeof styles)
      throw Error(formatProdErrorMessage(62));
    node = node.style;
    if (null != prevStyles) {
      for (var styleName in prevStyles)
        !prevStyles.hasOwnProperty(styleName) || null != styles && styles.hasOwnProperty(styleName) || (0 === styleName.indexOf("--") ? node.setProperty(styleName, "") : "float" === styleName ? node.cssFloat = "" : node[styleName] = "");
      for (var styleName$16 in styles)
        styleName = styles[styleName$16], styles.hasOwnProperty(styleName$16) && prevStyles[styleName$16] !== styleName && setValueForStyle(node, styleName$16, styleName);
    } else
      for (var styleName$17 in styles)
        styles.hasOwnProperty(styleName$17) && setValueForStyle(node, styleName$17, styles[styleName$17]);
  }
  function isCustomElement(tagName) {
    if (-1 === tagName.indexOf("-")) return false;
    switch (tagName) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return false;
      default:
        return true;
    }
  }
  var aliases = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function sanitizeURL(url) {
    return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
  }
  function noop$1() {
  }
  var currentReplayingEvent = null;
  function getEventTarget(nativeEvent) {
    nativeEvent = nativeEvent.target || nativeEvent.srcElement || window;
    nativeEvent.correspondingUseElement && (nativeEvent = nativeEvent.correspondingUseElement);
    return 3 === nativeEvent.nodeType ? nativeEvent.parentNode : nativeEvent;
  }
  var restoreTarget = null, restoreQueue = null;
  function restoreStateOfTarget(target) {
    var internalInstance = getInstanceFromNode(target);
    if (internalInstance && (target = internalInstance.stateNode)) {
      var props = target[internalPropsKey] || null;
      a: switch (target = internalInstance.stateNode, internalInstance.type) {
        case "input":
          updateInput(
            target,
            props.value,
            props.defaultValue,
            props.defaultValue,
            props.checked,
            props.defaultChecked,
            props.type,
            props.name
          );
          internalInstance = props.name;
          if ("radio" === props.type && null != internalInstance) {
            for (props = target; props.parentNode; ) props = props.parentNode;
            props = props.querySelectorAll(
              'input[name="' + escapeSelectorAttributeValueInsideDoubleQuotes(
                "" + internalInstance
              ) + '"][type="radio"]'
            );
            for (internalInstance = 0; internalInstance < props.length; internalInstance++) {
              var otherNode = props[internalInstance];
              if (otherNode !== target && otherNode.form === target.form) {
                var otherProps = otherNode[internalPropsKey] || null;
                if (!otherProps) throw Error(formatProdErrorMessage(90));
                updateInput(
                  otherNode,
                  otherProps.value,
                  otherProps.defaultValue,
                  otherProps.defaultValue,
                  otherProps.checked,
                  otherProps.defaultChecked,
                  otherProps.type,
                  otherProps.name
                );
              }
            }
            for (internalInstance = 0; internalInstance < props.length; internalInstance++)
              otherNode = props[internalInstance], otherNode.form === target.form && updateValueIfChanged(otherNode);
          }
          break a;
        case "textarea":
          updateTextarea(target, props.value, props.defaultValue);
          break a;
        case "select":
          internalInstance = props.value, null != internalInstance && updateOptions(target, !!props.multiple, internalInstance, false);
      }
    }
  }
  var isInsideEventHandler = false;
  function batchedUpdates$1(fn, a, b) {
    if (isInsideEventHandler) return fn(a, b);
    isInsideEventHandler = true;
    try {
      var JSCompiler_inline_result = fn(a);
      return JSCompiler_inline_result;
    } finally {
      if (isInsideEventHandler = false, null !== restoreTarget || null !== restoreQueue) {
        if (flushSyncWork$1(), restoreTarget && (a = restoreTarget, fn = restoreQueue, restoreQueue = restoreTarget = null, restoreStateOfTarget(a), fn))
          for (a = 0; a < fn.length; a++) restoreStateOfTarget(fn[a]);
      }
    }
  }
  function getListener(inst, registrationName) {
    var stateNode = inst.stateNode;
    if (null === stateNode) return null;
    var props = stateNode[internalPropsKey] || null;
    if (null === props) return null;
    stateNode = props[registrationName];
    a: switch (registrationName) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (props = !props.disabled) || (inst = inst.type, props = !("button" === inst || "input" === inst || "select" === inst || "textarea" === inst));
        inst = !props;
        break a;
      default:
        inst = false;
    }
    if (inst) return null;
    if (stateNode && "function" !== typeof stateNode)
      throw Error(
        formatProdErrorMessage(231, registrationName, typeof stateNode)
      );
    return stateNode;
  }
  var canUseDOM = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), passiveBrowserEventsSupported = false;
  if (canUseDOM)
    try {
      var options = {};
      Object.defineProperty(options, "passive", {
        get: function() {
          passiveBrowserEventsSupported = true;
        }
      });
      window.addEventListener("test", options, options);
      window.removeEventListener("test", options, options);
    } catch (e) {
      passiveBrowserEventsSupported = false;
    }
  var root = null, startText = null, fallbackText = null;
  function getData() {
    if (fallbackText) return fallbackText;
    var start, startValue = startText, startLength = startValue.length, end, endValue = "value" in root ? root.value : root.textContent, endLength = endValue.length;
    for (start = 0; start < startLength && startValue[start] === endValue[start]; start++) ;
    var minEnd = startLength - start;
    for (end = 1; end <= minEnd && startValue[startLength - end] === endValue[endLength - end]; end++) ;
    return fallbackText = endValue.slice(start, 1 < end ? 1 - end : void 0);
  }
  function getEventCharCode(nativeEvent) {
    var keyCode = nativeEvent.keyCode;
    "charCode" in nativeEvent ? (nativeEvent = nativeEvent.charCode, 0 === nativeEvent && 13 === keyCode && (nativeEvent = 13)) : nativeEvent = keyCode;
    10 === nativeEvent && (nativeEvent = 13);
    return 32 <= nativeEvent || 13 === nativeEvent ? nativeEvent : 0;
  }
  function functionThatReturnsTrue() {
    return true;
  }
  function functionThatReturnsFalse() {
    return false;
  }
  function createSyntheticEvent(Interface) {
    function SyntheticBaseEvent(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
      this._reactName = reactName;
      this._targetInst = targetInst;
      this.type = reactEventType;
      this.nativeEvent = nativeEvent;
      this.target = nativeEventTarget;
      this.currentTarget = null;
      for (var propName in Interface)
        Interface.hasOwnProperty(propName) && (reactName = Interface[propName], this[propName] = reactName ? reactName(nativeEvent) : nativeEvent[propName]);
      this.isDefaultPrevented = (null != nativeEvent.defaultPrevented ? nativeEvent.defaultPrevented : false === nativeEvent.returnValue) ? functionThatReturnsTrue : functionThatReturnsFalse;
      this.isPropagationStopped = functionThatReturnsFalse;
      return this;
    }
    assign(SyntheticBaseEvent.prototype, {
      preventDefault: function() {
        this.defaultPrevented = true;
        var event = this.nativeEvent;
        event && (event.preventDefault ? event.preventDefault() : "unknown" !== typeof event.returnValue && (event.returnValue = false), this.isDefaultPrevented = functionThatReturnsTrue);
      },
      stopPropagation: function() {
        var event = this.nativeEvent;
        event && (event.stopPropagation ? event.stopPropagation() : "unknown" !== typeof event.cancelBubble && (event.cancelBubble = true), this.isPropagationStopped = functionThatReturnsTrue);
      },
      persist: function() {
      },
      isPersistent: functionThatReturnsTrue
    });
    return SyntheticBaseEvent;
  }
  var EventInterface = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, SyntheticEvent = createSyntheticEvent(EventInterface), UIEventInterface = assign({}, EventInterface, { view: 0, detail: 0 }), SyntheticUIEvent = createSyntheticEvent(UIEventInterface), lastMovementX, lastMovementY, lastMouseEvent, MouseEventInterface = assign({}, UIEventInterface, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: getEventModifierState,
    button: 0,
    buttons: 0,
    relatedTarget: function(event) {
      return void 0 === event.relatedTarget ? event.fromElement === event.srcElement ? event.toElement : event.fromElement : event.relatedTarget;
    },
    movementX: function(event) {
      if ("movementX" in event) return event.movementX;
      event !== lastMouseEvent && (lastMouseEvent && "mousemove" === event.type ? (lastMovementX = event.screenX - lastMouseEvent.screenX, lastMovementY = event.screenY - lastMouseEvent.screenY) : lastMovementY = lastMovementX = 0, lastMouseEvent = event);
      return lastMovementX;
    },
    movementY: function(event) {
      return "movementY" in event ? event.movementY : lastMovementY;
    }
  }), SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface), DragEventInterface = assign({}, MouseEventInterface, { dataTransfer: 0 }), SyntheticDragEvent = createSyntheticEvent(DragEventInterface), FocusEventInterface = assign({}, UIEventInterface, { relatedTarget: 0 }), SyntheticFocusEvent = createSyntheticEvent(FocusEventInterface), AnimationEventInterface = assign({}, EventInterface, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), SyntheticAnimationEvent = createSyntheticEvent(AnimationEventInterface), ClipboardEventInterface = assign({}, EventInterface, {
    clipboardData: function(event) {
      return "clipboardData" in event ? event.clipboardData : window.clipboardData;
    }
  }), SyntheticClipboardEvent = createSyntheticEvent(ClipboardEventInterface), CompositionEventInterface = assign({}, EventInterface, { data: 0 }), SyntheticCompositionEvent = createSyntheticEvent(CompositionEventInterface), normalizeKey = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, translateToKey = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, modifierKeyToProp = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function modifierStateGetter(keyArg) {
    var nativeEvent = this.nativeEvent;
    return nativeEvent.getModifierState ? nativeEvent.getModifierState(keyArg) : (keyArg = modifierKeyToProp[keyArg]) ? !!nativeEvent[keyArg] : false;
  }
  function getEventModifierState() {
    return modifierStateGetter;
  }
  var KeyboardEventInterface = assign({}, UIEventInterface, {
    key: function(nativeEvent) {
      if (nativeEvent.key) {
        var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
        if ("Unidentified" !== key) return key;
      }
      return "keypress" === nativeEvent.type ? (nativeEvent = getEventCharCode(nativeEvent), 13 === nativeEvent ? "Enter" : String.fromCharCode(nativeEvent)) : "keydown" === nativeEvent.type || "keyup" === nativeEvent.type ? translateToKey[nativeEvent.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: getEventModifierState,
    charCode: function(event) {
      return "keypress" === event.type ? getEventCharCode(event) : 0;
    },
    keyCode: function(event) {
      return "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
    },
    which: function(event) {
      return "keypress" === event.type ? getEventCharCode(event) : "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
    }
  }), SyntheticKeyboardEvent = createSyntheticEvent(KeyboardEventInterface), PointerEventInterface = assign({}, MouseEventInterface, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), SyntheticPointerEvent = createSyntheticEvent(PointerEventInterface), TouchEventInterface = assign({}, UIEventInterface, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: getEventModifierState
  }), SyntheticTouchEvent = createSyntheticEvent(TouchEventInterface), TransitionEventInterface = assign({}, EventInterface, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), SyntheticTransitionEvent = createSyntheticEvent(TransitionEventInterface), WheelEventInterface = assign({}, MouseEventInterface, {
    deltaX: function(event) {
      return "deltaX" in event ? event.deltaX : "wheelDeltaX" in event ? -event.wheelDeltaX : 0;
    },
    deltaY: function(event) {
      return "deltaY" in event ? event.deltaY : "wheelDeltaY" in event ? -event.wheelDeltaY : "wheelDelta" in event ? -event.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), SyntheticWheelEvent = createSyntheticEvent(WheelEventInterface), ToggleEventInterface = assign({}, EventInterface, {
    newState: 0,
    oldState: 0
  }), SyntheticToggleEvent = createSyntheticEvent(ToggleEventInterface), END_KEYCODES = [9, 13, 27, 32], canUseCompositionEvent = canUseDOM && "CompositionEvent" in window, documentMode = null;
  canUseDOM && "documentMode" in document && (documentMode = document.documentMode);
  var canUseTextInputEvent = canUseDOM && "TextEvent" in window && !documentMode, useFallbackCompositionData = canUseDOM && (!canUseCompositionEvent || documentMode && 8 < documentMode && 11 >= documentMode), SPACEBAR_CHAR = String.fromCharCode(32), hasSpaceKeypress = false;
  function isFallbackCompositionEnd(domEventName, nativeEvent) {
    switch (domEventName) {
      case "keyup":
        return -1 !== END_KEYCODES.indexOf(nativeEvent.keyCode);
      case "keydown":
        return 229 !== nativeEvent.keyCode;
      case "keypress":
      case "mousedown":
      case "focusout":
        return true;
      default:
        return false;
    }
  }
  function getDataFromCustomEvent(nativeEvent) {
    nativeEvent = nativeEvent.detail;
    return "object" === typeof nativeEvent && "data" in nativeEvent ? nativeEvent.data : null;
  }
  var isComposing = false;
  function getNativeBeforeInputChars(domEventName, nativeEvent) {
    switch (domEventName) {
      case "compositionend":
        return getDataFromCustomEvent(nativeEvent);
      case "keypress":
        if (32 !== nativeEvent.which) return null;
        hasSpaceKeypress = true;
        return SPACEBAR_CHAR;
      case "textInput":
        return domEventName = nativeEvent.data, domEventName === SPACEBAR_CHAR && hasSpaceKeypress ? null : domEventName;
      default:
        return null;
    }
  }
  function getFallbackBeforeInputChars(domEventName, nativeEvent) {
    if (isComposing)
      return "compositionend" === domEventName || !canUseCompositionEvent && isFallbackCompositionEnd(domEventName, nativeEvent) ? (domEventName = getData(), fallbackText = startText = root = null, isComposing = false, domEventName) : null;
    switch (domEventName) {
      case "paste":
        return null;
      case "keypress":
        if (!(nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) || nativeEvent.ctrlKey && nativeEvent.altKey) {
          if (nativeEvent.char && 1 < nativeEvent.char.length)
            return nativeEvent.char;
          if (nativeEvent.which) return String.fromCharCode(nativeEvent.which);
        }
        return null;
      case "compositionend":
        return useFallbackCompositionData && "ko" !== nativeEvent.locale ? null : nativeEvent.data;
      default:
        return null;
    }
  }
  var supportedInputTypes = {
    color: true,
    date: true,
    datetime: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true
  };
  function isTextInputElement(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return "input" === nodeName ? !!supportedInputTypes[elem.type] : "textarea" === nodeName ? true : false;
  }
  function createAndAccumulateChangeEvent(dispatchQueue, inst, nativeEvent, target) {
    restoreTarget ? restoreQueue ? restoreQueue.push(target) : restoreQueue = [target] : restoreTarget = target;
    inst = accumulateTwoPhaseListeners(inst, "onChange");
    0 < inst.length && (nativeEvent = new SyntheticEvent(
      "onChange",
      "change",
      null,
      nativeEvent,
      target
    ), dispatchQueue.push({ event: nativeEvent, listeners: inst }));
  }
  var activeElement$1 = null, activeElementInst$1 = null;
  function runEventInBatch(dispatchQueue) {
    processDispatchQueue(dispatchQueue, 0);
  }
  function getInstIfValueChanged(targetInst) {
    var targetNode = getNodeFromInstance(targetInst);
    if (updateValueIfChanged(targetNode)) return targetInst;
  }
  function getTargetInstForChangeEvent(domEventName, targetInst) {
    if ("change" === domEventName) return targetInst;
  }
  var isInputEventSupported = false;
  if (canUseDOM) {
    var JSCompiler_inline_result$jscomp$286;
    if (canUseDOM) {
      var isSupported$jscomp$inline_427 = "oninput" in document;
      if (!isSupported$jscomp$inline_427) {
        var element$jscomp$inline_428 = document.createElement("div");
        element$jscomp$inline_428.setAttribute("oninput", "return;");
        isSupported$jscomp$inline_427 = "function" === typeof element$jscomp$inline_428.oninput;
      }
      JSCompiler_inline_result$jscomp$286 = isSupported$jscomp$inline_427;
    } else JSCompiler_inline_result$jscomp$286 = false;
    isInputEventSupported = JSCompiler_inline_result$jscomp$286 && (!document.documentMode || 9 < document.documentMode);
  }
  function stopWatchingForValueChange() {
    activeElement$1 && (activeElement$1.detachEvent("onpropertychange", handlePropertyChange), activeElementInst$1 = activeElement$1 = null);
  }
  function handlePropertyChange(nativeEvent) {
    if ("value" === nativeEvent.propertyName && getInstIfValueChanged(activeElementInst$1)) {
      var dispatchQueue = [];
      createAndAccumulateChangeEvent(
        dispatchQueue,
        activeElementInst$1,
        nativeEvent,
        getEventTarget(nativeEvent)
      );
      batchedUpdates$1(runEventInBatch, dispatchQueue);
    }
  }
  function handleEventsForInputEventPolyfill(domEventName, target, targetInst) {
    "focusin" === domEventName ? (stopWatchingForValueChange(), activeElement$1 = target, activeElementInst$1 = targetInst, activeElement$1.attachEvent("onpropertychange", handlePropertyChange)) : "focusout" === domEventName && stopWatchingForValueChange();
  }
  function getTargetInstForInputEventPolyfill(domEventName) {
    if ("selectionchange" === domEventName || "keyup" === domEventName || "keydown" === domEventName)
      return getInstIfValueChanged(activeElementInst$1);
  }
  function getTargetInstForClickEvent(domEventName, targetInst) {
    if ("click" === domEventName) return getInstIfValueChanged(targetInst);
  }
  function getTargetInstForInputOrChangeEvent(domEventName, targetInst) {
    if ("input" === domEventName || "change" === domEventName)
      return getInstIfValueChanged(targetInst);
  }
  function is(x, y) {
    return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
  }
  var objectIs = "function" === typeof Object.is ? Object.is : is;
  function shallowEqual(objA, objB) {
    if (objectIs(objA, objB)) return true;
    if ("object" !== typeof objA || null === objA || "object" !== typeof objB || null === objB)
      return false;
    var keysA = Object.keys(objA), keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (keysB = 0; keysB < keysA.length; keysB++) {
      var currentKey = keysA[keysB];
      if (!hasOwnProperty.call(objB, currentKey) || !objectIs(objA[currentKey], objB[currentKey]))
        return false;
    }
    return true;
  }
  function getLeafNode(node) {
    for (; node && node.firstChild; ) node = node.firstChild;
    return node;
  }
  function getNodeForCharacterOffset(root2, offset) {
    var node = getLeafNode(root2);
    root2 = 0;
    for (var nodeEnd; node; ) {
      if (3 === node.nodeType) {
        nodeEnd = root2 + node.textContent.length;
        if (root2 <= offset && nodeEnd >= offset)
          return { node, offset: offset - root2 };
        root2 = nodeEnd;
      }
      a: {
        for (; node; ) {
          if (node.nextSibling) {
            node = node.nextSibling;
            break a;
          }
          node = node.parentNode;
        }
        node = void 0;
      }
      node = getLeafNode(node);
    }
  }
  function containsNode(outerNode, innerNode) {
    return outerNode && innerNode ? outerNode === innerNode ? true : outerNode && 3 === outerNode.nodeType ? false : innerNode && 3 === innerNode.nodeType ? containsNode(outerNode, innerNode.parentNode) : "contains" in outerNode ? outerNode.contains(innerNode) : outerNode.compareDocumentPosition ? !!(outerNode.compareDocumentPosition(innerNode) & 16) : false : false;
  }
  function getActiveElementDeep(containerInfo) {
    containerInfo = null != containerInfo && null != containerInfo.ownerDocument && null != containerInfo.ownerDocument.defaultView ? containerInfo.ownerDocument.defaultView : window;
    for (var element = getActiveElement(containerInfo.document); element instanceof containerInfo.HTMLIFrameElement; ) {
      try {
        var JSCompiler_inline_result = "string" === typeof element.contentWindow.location.href;
      } catch (err) {
        JSCompiler_inline_result = false;
      }
      if (JSCompiler_inline_result) containerInfo = element.contentWindow;
      else break;
      element = getActiveElement(containerInfo.document);
    }
    return element;
  }
  function hasSelectionCapabilities(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return nodeName && ("input" === nodeName && ("text" === elem.type || "search" === elem.type || "tel" === elem.type || "url" === elem.type || "password" === elem.type) || "textarea" === nodeName || "true" === elem.contentEditable);
  }
  var skipSelectionChangeEvent = canUseDOM && "documentMode" in document && 11 >= document.documentMode, activeElement = null, activeElementInst = null, lastSelection = null, mouseDown = false;
  function constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget) {
    var doc = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget.document : 9 === nativeEventTarget.nodeType ? nativeEventTarget : nativeEventTarget.ownerDocument;
    mouseDown || null == activeElement || activeElement !== getActiveElement(doc) || (doc = activeElement, "selectionStart" in doc && hasSelectionCapabilities(doc) ? doc = { start: doc.selectionStart, end: doc.selectionEnd } : (doc = (doc.ownerDocument && doc.ownerDocument.defaultView || window).getSelection(), doc = {
      anchorNode: doc.anchorNode,
      anchorOffset: doc.anchorOffset,
      focusNode: doc.focusNode,
      focusOffset: doc.focusOffset
    }), lastSelection && shallowEqual(lastSelection, doc) || (lastSelection = doc, doc = accumulateTwoPhaseListeners(activeElementInst, "onSelect"), 0 < doc.length && (nativeEvent = new SyntheticEvent(
      "onSelect",
      "select",
      null,
      nativeEvent,
      nativeEventTarget
    ), dispatchQueue.push({ event: nativeEvent, listeners: doc }), nativeEvent.target = activeElement)));
  }
  function makePrefixMap(styleProp, eventName) {
    var prefixes = {};
    prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
    prefixes["Webkit" + styleProp] = "webkit" + eventName;
    prefixes["Moz" + styleProp] = "moz" + eventName;
    return prefixes;
  }
  var vendorPrefixes = {
    animationend: makePrefixMap("Animation", "AnimationEnd"),
    animationiteration: makePrefixMap("Animation", "AnimationIteration"),
    animationstart: makePrefixMap("Animation", "AnimationStart"),
    transitionrun: makePrefixMap("Transition", "TransitionRun"),
    transitionstart: makePrefixMap("Transition", "TransitionStart"),
    transitioncancel: makePrefixMap("Transition", "TransitionCancel"),
    transitionend: makePrefixMap("Transition", "TransitionEnd")
  }, prefixedEventNames = {}, style = {};
  canUseDOM && (style = document.createElement("div").style, "AnimationEvent" in window || (delete vendorPrefixes.animationend.animation, delete vendorPrefixes.animationiteration.animation, delete vendorPrefixes.animationstart.animation), "TransitionEvent" in window || delete vendorPrefixes.transitionend.transition);
  function getVendorPrefixedEventName(eventName) {
    if (prefixedEventNames[eventName]) return prefixedEventNames[eventName];
    if (!vendorPrefixes[eventName]) return eventName;
    var prefixMap = vendorPrefixes[eventName], styleProp;
    for (styleProp in prefixMap)
      if (prefixMap.hasOwnProperty(styleProp) && styleProp in style)
        return prefixedEventNames[eventName] = prefixMap[styleProp];
    return eventName;
  }
  var ANIMATION_END = getVendorPrefixedEventName("animationend"), ANIMATION_ITERATION = getVendorPrefixedEventName("animationiteration"), ANIMATION_START = getVendorPrefixedEventName("animationstart"), TRANSITION_RUN = getVendorPrefixedEventName("transitionrun"), TRANSITION_START = getVendorPrefixedEventName("transitionstart"), TRANSITION_CANCEL = getVendorPrefixedEventName("transitioncancel"), TRANSITION_END = getVendorPrefixedEventName("transitionend"), topLevelEventsToReactNames = /* @__PURE__ */ new Map(), simpleEventPluginEvents = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  simpleEventPluginEvents.push("scrollEnd");
  function registerSimpleEvent(domEventName, reactName) {
    topLevelEventsToReactNames.set(domEventName, reactName);
    registerTwoPhaseEvent(reactName, [domEventName]);
  }
  var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
    if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
      var event = new window.ErrorEvent("error", {
        bubbles: true,
        cancelable: true,
        message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
        error
      });
      if (!window.dispatchEvent(event)) return;
    } else if ("object" === typeof process && "function" === typeof process.emit) {
      process.emit("uncaughtException", error);
      return;
    }
    console.error(error);
  }, concurrentQueues = [], concurrentQueuesIndex = 0, concurrentlyUpdatedLanes = 0;
  function finishQueueingConcurrentUpdates() {
    for (var endIndex = concurrentQueuesIndex, i = concurrentlyUpdatedLanes = concurrentQueuesIndex = 0; i < endIndex; ) {
      var fiber = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var queue = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var update = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var lane = concurrentQueues[i];
      concurrentQueues[i++] = null;
      if (null !== queue && null !== update) {
        var pending = queue.pending;
        null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
        queue.pending = update;
      }
      0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
    }
  }
  function enqueueUpdate$1(fiber, queue, update, lane) {
    concurrentQueues[concurrentQueuesIndex++] = fiber;
    concurrentQueues[concurrentQueuesIndex++] = queue;
    concurrentQueues[concurrentQueuesIndex++] = update;
    concurrentQueues[concurrentQueuesIndex++] = lane;
    concurrentlyUpdatedLanes |= lane;
    fiber.lanes |= lane;
    fiber = fiber.alternate;
    null !== fiber && (fiber.lanes |= lane);
  }
  function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
    enqueueUpdate$1(fiber, queue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function enqueueConcurrentRenderForLane(fiber, lane) {
    enqueueUpdate$1(fiber, null, null, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
    sourceFiber.lanes |= lane;
    var alternate = sourceFiber.alternate;
    null !== alternate && (alternate.lanes |= lane);
    for (var isHidden = false, parent = sourceFiber.return; null !== parent; )
      parent.childLanes |= lane, alternate = parent.alternate, null !== alternate && (alternate.childLanes |= lane), 22 === parent.tag && (sourceFiber = parent.stateNode, null === sourceFiber || sourceFiber._visibility & 1 || (isHidden = true)), sourceFiber = parent, parent = parent.return;
    return 3 === sourceFiber.tag ? (parent = sourceFiber.stateNode, isHidden && null !== update && (isHidden = 31 - clz32(lane), sourceFiber = parent.hiddenUpdates, alternate = sourceFiber[isHidden], null === alternate ? sourceFiber[isHidden] = [update] : alternate.push(update), update.lane = lane | 536870912), parent) : null;
  }
  function getRootForUpdatedFiber(sourceFiber) {
    if (50 < nestedUpdateCount)
      throw nestedUpdateCount = 0, rootWithNestedUpdates = null, Error(formatProdErrorMessage(185));
    for (var parent = sourceFiber.return; null !== parent; )
      sourceFiber = parent, parent = sourceFiber.return;
    return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
  }
  var emptyContextObject = {};
  function FiberNode(tag, pendingProps, key, mode) {
    this.tag = tag;
    this.key = key;
    this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
    this.index = 0;
    this.refCleanup = this.ref = null;
    this.pendingProps = pendingProps;
    this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
    this.mode = mode;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function createFiberImplClass(tag, pendingProps, key, mode) {
    return new FiberNode(tag, pendingProps, key, mode);
  }
  function shouldConstruct(Component) {
    Component = Component.prototype;
    return !(!Component || !Component.isReactComponent);
  }
  function createWorkInProgress(current, pendingProps) {
    var workInProgress2 = current.alternate;
    null === workInProgress2 ? (workInProgress2 = createFiberImplClass(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    ), workInProgress2.elementType = current.elementType, workInProgress2.type = current.type, workInProgress2.stateNode = current.stateNode, workInProgress2.alternate = current, current.alternate = workInProgress2) : (workInProgress2.pendingProps = pendingProps, workInProgress2.type = current.type, workInProgress2.flags = 0, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null);
    workInProgress2.flags = current.flags & 65011712;
    workInProgress2.childLanes = current.childLanes;
    workInProgress2.lanes = current.lanes;
    workInProgress2.child = current.child;
    workInProgress2.memoizedProps = current.memoizedProps;
    workInProgress2.memoizedState = current.memoizedState;
    workInProgress2.updateQueue = current.updateQueue;
    pendingProps = current.dependencies;
    workInProgress2.dependencies = null === pendingProps ? null : { lanes: pendingProps.lanes, firstContext: pendingProps.firstContext };
    workInProgress2.sibling = current.sibling;
    workInProgress2.index = current.index;
    workInProgress2.ref = current.ref;
    workInProgress2.refCleanup = current.refCleanup;
    return workInProgress2;
  }
  function resetWorkInProgress(workInProgress2, renderLanes2) {
    workInProgress2.flags &= 65011714;
    var current = workInProgress2.alternate;
    null === current ? (workInProgress2.childLanes = 0, workInProgress2.lanes = renderLanes2, workInProgress2.child = null, workInProgress2.subtreeFlags = 0, workInProgress2.memoizedProps = null, workInProgress2.memoizedState = null, workInProgress2.updateQueue = null, workInProgress2.dependencies = null, workInProgress2.stateNode = null) : (workInProgress2.childLanes = current.childLanes, workInProgress2.lanes = current.lanes, workInProgress2.child = current.child, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null, workInProgress2.memoizedProps = current.memoizedProps, workInProgress2.memoizedState = current.memoizedState, workInProgress2.updateQueue = current.updateQueue, workInProgress2.type = current.type, renderLanes2 = current.dependencies, workInProgress2.dependencies = null === renderLanes2 ? null : {
      lanes: renderLanes2.lanes,
      firstContext: renderLanes2.firstContext
    });
    return workInProgress2;
  }
  function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
    var fiberTag = 0;
    owner = type;
    if ("function" === typeof type) shouldConstruct(type) && (fiberTag = 1);
    else if ("string" === typeof type)
      fiberTag = isHostHoistableType(
        type,
        pendingProps,
        contextStackCursor.current
      ) ? 26 : "html" === type || "head" === type || "body" === type ? 27 : 5;
    else
      a: switch (type) {
        case REACT_ACTIVITY_TYPE:
          return type = createFiberImplClass(31, pendingProps, key, mode), type.elementType = REACT_ACTIVITY_TYPE, type.lanes = lanes, type;
        case REACT_FRAGMENT_TYPE:
          return createFiberFromFragment(pendingProps.children, mode, lanes, key);
        case REACT_STRICT_MODE_TYPE:
          fiberTag = 8;
          mode |= 24;
          break;
        case REACT_PROFILER_TYPE:
          return type = createFiberImplClass(12, pendingProps, key, mode | 2), type.elementType = REACT_PROFILER_TYPE, type.lanes = lanes, type;
        case REACT_SUSPENSE_TYPE:
          return type = createFiberImplClass(13, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_TYPE, type.lanes = lanes, type;
        case REACT_SUSPENSE_LIST_TYPE:
          return type = createFiberImplClass(19, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_LIST_TYPE, type.lanes = lanes, type;
        default:
          if ("object" === typeof type && null !== type)
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                fiberTag = 10;
                break a;
              case REACT_CONSUMER_TYPE:
                fiberTag = 9;
                break a;
              case REACT_FORWARD_REF_TYPE:
                fiberTag = 11;
                break a;
              case REACT_MEMO_TYPE:
                fiberTag = 14;
                break a;
              case REACT_LAZY_TYPE:
                fiberTag = 16;
                owner = null;
                break a;
            }
          fiberTag = 29;
          pendingProps = Error(
            formatProdErrorMessage(130, null === type ? "null" : typeof type, "")
          );
          owner = null;
      }
    key = createFiberImplClass(fiberTag, pendingProps, key, mode);
    key.elementType = type;
    key.type = owner;
    key.lanes = lanes;
    return key;
  }
  function createFiberFromFragment(elements, mode, lanes, key) {
    elements = createFiberImplClass(7, elements, key, mode);
    elements.lanes = lanes;
    return elements;
  }
  function createFiberFromText(content, mode, lanes) {
    content = createFiberImplClass(6, content, null, mode);
    content.lanes = lanes;
    return content;
  }
  function createFiberFromDehydratedFragment(dehydratedNode) {
    var fiber = createFiberImplClass(18, null, null, 0);
    fiber.stateNode = dehydratedNode;
    return fiber;
  }
  function createFiberFromPortal(portal, mode, lanes) {
    mode = createFiberImplClass(
      4,
      null !== portal.children ? portal.children : [],
      portal.key,
      mode
    );
    mode.lanes = lanes;
    mode.stateNode = {
      containerInfo: portal.containerInfo,
      pendingChildren: null,
      implementation: portal.implementation
    };
    return mode;
  }
  var CapturedStacks = /* @__PURE__ */ new WeakMap();
  function createCapturedValueAtFiber(value, source) {
    if ("object" === typeof value && null !== value) {
      var existing = CapturedStacks.get(value);
      if (void 0 !== existing) return existing;
      source = {
        value,
        source,
        stack: getStackByFiberInDevAndProd(source)
      };
      CapturedStacks.set(value, source);
      return source;
    }
    return {
      value,
      source,
      stack: getStackByFiberInDevAndProd(source)
    };
  }
  var forkStack = [], forkStackIndex = 0, treeForkProvider = null, treeForkCount = 0, idStack = [], idStackIndex = 0, treeContextProvider = null, treeContextId = 1, treeContextOverflow = "";
  function pushTreeFork(workInProgress2, totalChildren) {
    forkStack[forkStackIndex++] = treeForkCount;
    forkStack[forkStackIndex++] = treeForkProvider;
    treeForkProvider = workInProgress2;
    treeForkCount = totalChildren;
  }
  function pushTreeId(workInProgress2, totalChildren, index2) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextProvider = workInProgress2;
    var baseIdWithLeadingBit = treeContextId;
    workInProgress2 = treeContextOverflow;
    var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
    baseIdWithLeadingBit &= ~(1 << baseLength);
    index2 += 1;
    var length = 32 - clz32(totalChildren) + baseLength;
    if (30 < length) {
      var numberOfOverflowBits = baseLength - baseLength % 5;
      length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
      baseIdWithLeadingBit >>= numberOfOverflowBits;
      baseLength -= numberOfOverflowBits;
      treeContextId = 1 << 32 - clz32(totalChildren) + baseLength | index2 << baseLength | baseIdWithLeadingBit;
      treeContextOverflow = length + workInProgress2;
    } else
      treeContextId = 1 << length | index2 << baseLength | baseIdWithLeadingBit, treeContextOverflow = workInProgress2;
  }
  function pushMaterializedTreeId(workInProgress2) {
    null !== workInProgress2.return && (pushTreeFork(workInProgress2, 1), pushTreeId(workInProgress2, 1, 0));
  }
  function popTreeContext(workInProgress2) {
    for (; workInProgress2 === treeForkProvider; )
      treeForkProvider = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null, treeForkCount = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null;
    for (; workInProgress2 === treeContextProvider; )
      treeContextProvider = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextOverflow = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextId = idStack[--idStackIndex], idStack[idStackIndex] = null;
  }
  function restoreSuspendedTreeContext(workInProgress2, suspendedContext) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextId = suspendedContext.id;
    treeContextOverflow = suspendedContext.overflow;
    treeContextProvider = workInProgress2;
  }
  var hydrationParentFiber = null, nextHydratableInstance = null, isHydrating = false, hydrationErrors = null, rootOrSingletonContext = false, HydrationMismatchException = Error(formatProdErrorMessage(519));
  function throwOnHydrationMismatch(fiber) {
    var error = Error(
      formatProdErrorMessage(
        418,
        1 < arguments.length && void 0 !== arguments[1] && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    queueHydrationError(createCapturedValueAtFiber(error, fiber));
    throw HydrationMismatchException;
  }
  function prepareToHydrateHostInstance(fiber) {
    var instance = fiber.stateNode, type = fiber.type, props = fiber.memoizedProps;
    instance[internalInstanceKey] = fiber;
    instance[internalPropsKey] = props;
    switch (type) {
      case "dialog":
        listenToNonDelegatedEvent("cancel", instance);
        listenToNonDelegatedEvent("close", instance);
        break;
      case "iframe":
      case "object":
      case "embed":
        listenToNonDelegatedEvent("load", instance);
        break;
      case "video":
      case "audio":
        for (type = 0; type < mediaEventTypes.length; type++)
          listenToNonDelegatedEvent(mediaEventTypes[type], instance);
        break;
      case "source":
        listenToNonDelegatedEvent("error", instance);
        break;
      case "img":
      case "image":
      case "link":
        listenToNonDelegatedEvent("error", instance);
        listenToNonDelegatedEvent("load", instance);
        break;
      case "details":
        listenToNonDelegatedEvent("toggle", instance);
        break;
      case "input":
        listenToNonDelegatedEvent("invalid", instance);
        initInput(
          instance,
          props.value,
          props.defaultValue,
          props.checked,
          props.defaultChecked,
          props.type,
          props.name,
          true
        );
        break;
      case "select":
        listenToNonDelegatedEvent("invalid", instance);
        break;
      case "textarea":
        listenToNonDelegatedEvent("invalid", instance), initTextarea(instance, props.value, props.defaultValue, props.children);
    }
    type = props.children;
    "string" !== typeof type && "number" !== typeof type && "bigint" !== typeof type || instance.textContent === "" + type || true === props.suppressHydrationWarning || checkForUnmatchedText(instance.textContent, type) ? (null != props.popover && (listenToNonDelegatedEvent("beforetoggle", instance), listenToNonDelegatedEvent("toggle", instance)), null != props.onScroll && listenToNonDelegatedEvent("scroll", instance), null != props.onScrollEnd && listenToNonDelegatedEvent("scrollend", instance), null != props.onClick && (instance.onclick = noop$1), instance = true) : instance = false;
    instance || throwOnHydrationMismatch(fiber, true);
  }
  function popToNextHostParent(fiber) {
    for (hydrationParentFiber = fiber.return; hydrationParentFiber; )
      switch (hydrationParentFiber.tag) {
        case 5:
        case 31:
        case 13:
          rootOrSingletonContext = false;
          return;
        case 27:
        case 3:
          rootOrSingletonContext = true;
          return;
        default:
          hydrationParentFiber = hydrationParentFiber.return;
      }
  }
  function popHydrationState(fiber) {
    if (fiber !== hydrationParentFiber) return false;
    if (!isHydrating) return popToNextHostParent(fiber), isHydrating = true, false;
    var tag = fiber.tag, JSCompiler_temp;
    if (JSCompiler_temp = 3 !== tag && 27 !== tag) {
      if (JSCompiler_temp = 5 === tag)
        JSCompiler_temp = fiber.type, JSCompiler_temp = !("form" !== JSCompiler_temp && "button" !== JSCompiler_temp) || shouldSetTextContent(fiber.type, fiber.memoizedProps);
      JSCompiler_temp = !JSCompiler_temp;
    }
    JSCompiler_temp && nextHydratableInstance && throwOnHydrationMismatch(fiber);
    popToNextHostParent(fiber);
    if (13 === tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
    } else if (31 === tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
    } else
      27 === tag ? (tag = nextHydratableInstance, isSingletonScope(fiber.type) ? (fiber = previousHydratableOnEnteringScopedSingleton, previousHydratableOnEnteringScopedSingleton = null, nextHydratableInstance = fiber) : nextHydratableInstance = tag) : nextHydratableInstance = hydrationParentFiber ? getNextHydratable(fiber.stateNode.nextSibling) : null;
    return true;
  }
  function resetHydrationState() {
    nextHydratableInstance = hydrationParentFiber = null;
    isHydrating = false;
  }
  function upgradeHydrationErrorsToRecoverable() {
    var queuedErrors = hydrationErrors;
    null !== queuedErrors && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = queuedErrors : workInProgressRootRecoverableErrors.push.apply(
      workInProgressRootRecoverableErrors,
      queuedErrors
    ), hydrationErrors = null);
    return queuedErrors;
  }
  function queueHydrationError(error) {
    null === hydrationErrors ? hydrationErrors = [error] : hydrationErrors.push(error);
  }
  var valueCursor = createCursor(null), currentlyRenderingFiber$1 = null, lastContextDependency = null;
  function pushProvider(providerFiber, context, nextValue) {
    push(valueCursor, context._currentValue);
    context._currentValue = nextValue;
  }
  function popProvider(context) {
    context._currentValue = valueCursor.current;
    pop(valueCursor);
  }
  function scheduleContextWorkOnParentPath(parent, renderLanes2, propagationRoot) {
    for (; null !== parent; ) {
      var alternate = parent.alternate;
      (parent.childLanes & renderLanes2) !== renderLanes2 ? (parent.childLanes |= renderLanes2, null !== alternate && (alternate.childLanes |= renderLanes2)) : null !== alternate && (alternate.childLanes & renderLanes2) !== renderLanes2 && (alternate.childLanes |= renderLanes2);
      if (parent === propagationRoot) break;
      parent = parent.return;
    }
  }
  function propagateContextChanges(workInProgress2, contexts, renderLanes2, forcePropagateEntireTree) {
    var fiber = workInProgress2.child;
    null !== fiber && (fiber.return = workInProgress2);
    for (; null !== fiber; ) {
      var list = fiber.dependencies;
      if (null !== list) {
        var nextFiber = fiber.child;
        list = list.firstContext;
        a: for (; null !== list; ) {
          var dependency = list;
          list = fiber;
          for (var i = 0; i < contexts.length; i++)
            if (dependency.context === contexts[i]) {
              list.lanes |= renderLanes2;
              dependency = list.alternate;
              null !== dependency && (dependency.lanes |= renderLanes2);
              scheduleContextWorkOnParentPath(
                list.return,
                renderLanes2,
                workInProgress2
              );
              forcePropagateEntireTree || (nextFiber = null);
              break a;
            }
          list = dependency.next;
        }
      } else if (18 === fiber.tag) {
        nextFiber = fiber.return;
        if (null === nextFiber) throw Error(formatProdErrorMessage(341));
        nextFiber.lanes |= renderLanes2;
        list = nextFiber.alternate;
        null !== list && (list.lanes |= renderLanes2);
        scheduleContextWorkOnParentPath(nextFiber, renderLanes2, workInProgress2);
        nextFiber = null;
      } else nextFiber = fiber.child;
      if (null !== nextFiber) nextFiber.return = fiber;
      else
        for (nextFiber = fiber; null !== nextFiber; ) {
          if (nextFiber === workInProgress2) {
            nextFiber = null;
            break;
          }
          fiber = nextFiber.sibling;
          if (null !== fiber) {
            fiber.return = nextFiber.return;
            nextFiber = fiber;
            break;
          }
          nextFiber = nextFiber.return;
        }
      fiber = nextFiber;
    }
  }
  function propagateParentContextChanges(current, workInProgress2, renderLanes2, forcePropagateEntireTree) {
    current = null;
    for (var parent = workInProgress2, isInsidePropagationBailout = false; null !== parent; ) {
      if (!isInsidePropagationBailout) {
        if (0 !== (parent.flags & 524288)) isInsidePropagationBailout = true;
        else if (0 !== (parent.flags & 262144)) break;
      }
      if (10 === parent.tag) {
        var currentParent = parent.alternate;
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
        currentParent = currentParent.memoizedProps;
        if (null !== currentParent) {
          var context = parent.type;
          objectIs(parent.pendingProps.value, currentParent.value) || (null !== current ? current.push(context) : current = [context]);
        }
      } else if (parent === hostTransitionProviderCursor.current) {
        currentParent = parent.alternate;
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
        currentParent.memoizedState.memoizedState !== parent.memoizedState.memoizedState && (null !== current ? current.push(HostTransitionContext) : current = [HostTransitionContext]);
      }
      parent = parent.return;
    }
    null !== current && propagateContextChanges(
      workInProgress2,
      current,
      renderLanes2,
      forcePropagateEntireTree
    );
    workInProgress2.flags |= 262144;
  }
  function checkIfContextChanged(currentDependencies) {
    for (currentDependencies = currentDependencies.firstContext; null !== currentDependencies; ) {
      if (!objectIs(
        currentDependencies.context._currentValue,
        currentDependencies.memoizedValue
      ))
        return true;
      currentDependencies = currentDependencies.next;
    }
    return false;
  }
  function prepareToReadContext(workInProgress2) {
    currentlyRenderingFiber$1 = workInProgress2;
    lastContextDependency = null;
    workInProgress2 = workInProgress2.dependencies;
    null !== workInProgress2 && (workInProgress2.firstContext = null);
  }
  function readContext(context) {
    return readContextForConsumer(currentlyRenderingFiber$1, context);
  }
  function readContextDuringReconciliation(consumer, context) {
    null === currentlyRenderingFiber$1 && prepareToReadContext(consumer);
    return readContextForConsumer(consumer, context);
  }
  function readContextForConsumer(consumer, context) {
    var value = context._currentValue;
    context = { context, memoizedValue: value, next: null };
    if (null === lastContextDependency) {
      if (null === consumer) throw Error(formatProdErrorMessage(308));
      lastContextDependency = context;
      consumer.dependencies = { lanes: 0, firstContext: context };
      consumer.flags |= 524288;
    } else lastContextDependency = lastContextDependency.next = context;
    return value;
  }
  var AbortControllerLocal = "undefined" !== typeof AbortController ? AbortController : function() {
    var listeners = [], signal = this.signal = {
      aborted: false,
      addEventListener: function(type, listener) {
        listeners.push(listener);
      }
    };
    this.abort = function() {
      signal.aborted = true;
      listeners.forEach(function(listener) {
        return listener();
      });
    };
  }, scheduleCallback$2 = Scheduler.unstable_scheduleCallback, NormalPriority = Scheduler.unstable_NormalPriority, CacheContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function createCache() {
    return {
      controller: new AbortControllerLocal(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function releaseCache(cache) {
    cache.refCount--;
    0 === cache.refCount && scheduleCallback$2(NormalPriority, function() {
      cache.controller.abort();
    });
  }
  var currentEntangledListeners = null, currentEntangledPendingCount = 0, currentEntangledLane = 0, currentEntangledActionThenable = null;
  function entangleAsyncAction(transition, thenable) {
    if (null === currentEntangledListeners) {
      var entangledListeners = currentEntangledListeners = [];
      currentEntangledPendingCount = 0;
      currentEntangledLane = requestTransitionLane();
      currentEntangledActionThenable = {
        status: "pending",
        value: void 0,
        then: function(resolve) {
          entangledListeners.push(resolve);
        }
      };
    }
    currentEntangledPendingCount++;
    thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
    return thenable;
  }
  function pingEngtangledActionScope() {
    if (0 === --currentEntangledPendingCount && null !== currentEntangledListeners) {
      null !== currentEntangledActionThenable && (currentEntangledActionThenable.status = "fulfilled");
      var listeners = currentEntangledListeners;
      currentEntangledListeners = null;
      currentEntangledLane = 0;
      currentEntangledActionThenable = null;
      for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
    }
  }
  function chainThenableValue(thenable, result) {
    var listeners = [], thenableWithOverride = {
      status: "pending",
      value: null,
      reason: null,
      then: function(resolve) {
        listeners.push(resolve);
      }
    };
    thenable.then(
      function() {
        thenableWithOverride.status = "fulfilled";
        thenableWithOverride.value = result;
        for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
      },
      function(error) {
        thenableWithOverride.status = "rejected";
        thenableWithOverride.reason = error;
        for (error = 0; error < listeners.length; error++)
          (0, listeners[error])(void 0);
      }
    );
    return thenableWithOverride;
  }
  var prevOnStartTransitionFinish = ReactSharedInternals.S;
  ReactSharedInternals.S = function(transition, returnValue) {
    globalMostRecentTransitionTime = now();
    "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && entangleAsyncAction(transition, returnValue);
    null !== prevOnStartTransitionFinish && prevOnStartTransitionFinish(transition, returnValue);
  };
  var resumedCache = createCursor(null);
  function peekCacheFromPool() {
    var cacheResumedFromPreviousRender = resumedCache.current;
    return null !== cacheResumedFromPreviousRender ? cacheResumedFromPreviousRender : workInProgressRoot.pooledCache;
  }
  function pushTransition(offscreenWorkInProgress, prevCachePool) {
    null === prevCachePool ? push(resumedCache, resumedCache.current) : push(resumedCache, prevCachePool.pool);
  }
  function getSuspendedCache() {
    var cacheFromPool = peekCacheFromPool();
    return null === cacheFromPool ? null : { parent: CacheContext._currentValue, pool: cacheFromPool };
  }
  var SuspenseException = Error(formatProdErrorMessage(460)), SuspenseyCommitException = Error(formatProdErrorMessage(474)), SuspenseActionException = Error(formatProdErrorMessage(542)), noopSuspenseyCommitThenable = { then: function() {
  } };
  function isThenableResolved(thenable) {
    thenable = thenable.status;
    return "fulfilled" === thenable || "rejected" === thenable;
  }
  function trackUsedThenable(thenableState2, thenable, index2) {
    index2 = thenableState2[index2];
    void 0 === index2 ? thenableState2.push(thenable) : index2 !== thenable && (thenable.then(noop$1, noop$1), thenable = index2);
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        throw thenableState2 = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState2), thenableState2;
      default:
        if ("string" === typeof thenable.status) thenable.then(noop$1, noop$1);
        else {
          thenableState2 = workInProgressRoot;
          if (null !== thenableState2 && 100 < thenableState2.shellSuspendCounter)
            throw Error(formatProdErrorMessage(482));
          thenableState2 = thenable;
          thenableState2.status = "pending";
          thenableState2.then(
            function(fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function(error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          );
        }
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenableState2 = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState2), thenableState2;
        }
        suspendedThenable = thenable;
        throw SuspenseException;
    }
  }
  function resolveLazy(lazyType) {
    try {
      var init = lazyType._init;
      return init(lazyType._payload);
    } catch (x) {
      if (null !== x && "object" === typeof x && "function" === typeof x.then)
        throw suspendedThenable = x, SuspenseException;
      throw x;
    }
  }
  var suspendedThenable = null;
  function getSuspendedThenable() {
    if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
    var thenable = suspendedThenable;
    suspendedThenable = null;
    return thenable;
  }
  function checkIfUseWrappedInAsyncCatch(rejectedReason) {
    if (rejectedReason === SuspenseException || rejectedReason === SuspenseActionException)
      throw Error(formatProdErrorMessage(483));
  }
  var thenableState$1 = null, thenableIndexCounter$1 = 0;
  function unwrapThenable(thenable) {
    var index2 = thenableIndexCounter$1;
    thenableIndexCounter$1 += 1;
    null === thenableState$1 && (thenableState$1 = []);
    return trackUsedThenable(thenableState$1, thenable, index2);
  }
  function coerceRef(workInProgress2, element) {
    element = element.props.ref;
    workInProgress2.ref = void 0 !== element ? element : null;
  }
  function throwOnInvalidObjectTypeImpl(returnFiber, newChild) {
    if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
      throw Error(formatProdErrorMessage(525));
    returnFiber = Object.prototype.toString.call(newChild);
    throw Error(
      formatProdErrorMessage(
        31,
        "[object Object]" === returnFiber ? "object with keys {" + Object.keys(newChild).join(", ") + "}" : returnFiber
      )
    );
  }
  function createChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
      if (shouldTrackSideEffects) {
        var deletions = returnFiber.deletions;
        null === deletions ? (returnFiber.deletions = [childToDelete], returnFiber.flags |= 16) : deletions.push(childToDelete);
      }
    }
    function deleteRemainingChildren(returnFiber, currentFirstChild) {
      if (!shouldTrackSideEffects) return null;
      for (; null !== currentFirstChild; )
        deleteChild(returnFiber, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
      return null;
    }
    function mapRemainingChildren(currentFirstChild) {
      for (var existingChildren = /* @__PURE__ */ new Map(); null !== currentFirstChild; )
        null !== currentFirstChild.key ? existingChildren.set(currentFirstChild.key, currentFirstChild) : existingChildren.set(currentFirstChild.index, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
      return existingChildren;
    }
    function useFiber(fiber, pendingProps) {
      fiber = createWorkInProgress(fiber, pendingProps);
      fiber.index = 0;
      fiber.sibling = null;
      return fiber;
    }
    function placeChild(newFiber, lastPlacedIndex, newIndex) {
      newFiber.index = newIndex;
      if (!shouldTrackSideEffects)
        return newFiber.flags |= 1048576, lastPlacedIndex;
      newIndex = newFiber.alternate;
      if (null !== newIndex)
        return newIndex = newIndex.index, newIndex < lastPlacedIndex ? (newFiber.flags |= 67108866, lastPlacedIndex) : newIndex;
      newFiber.flags |= 67108866;
      return lastPlacedIndex;
    }
    function placeSingleChild(newFiber) {
      shouldTrackSideEffects && null === newFiber.alternate && (newFiber.flags |= 67108866);
      return newFiber;
    }
    function updateTextNode(returnFiber, current, textContent, lanes) {
      if (null === current || 6 !== current.tag)
        return current = createFiberFromText(textContent, returnFiber.mode, lanes), current.return = returnFiber, current;
      current = useFiber(current, textContent);
      current.return = returnFiber;
      return current;
    }
    function updateElement(returnFiber, current, element, lanes) {
      var elementType = element.type;
      if (elementType === REACT_FRAGMENT_TYPE)
        return updateFragment(
          returnFiber,
          current,
          element.props.children,
          lanes,
          element.key
        );
      if (null !== current && (current.elementType === elementType || "object" === typeof elementType && null !== elementType && elementType.$$typeof === REACT_LAZY_TYPE && resolveLazy(elementType) === current.type))
        return current = useFiber(current, element.props), coerceRef(current, element), current.return = returnFiber, current;
      current = createFiberFromTypeAndProps(
        element.type,
        element.key,
        element.props,
        null,
        returnFiber.mode,
        lanes
      );
      coerceRef(current, element);
      current.return = returnFiber;
      return current;
    }
    function updatePortal(returnFiber, current, portal, lanes) {
      if (null === current || 4 !== current.tag || current.stateNode.containerInfo !== portal.containerInfo || current.stateNode.implementation !== portal.implementation)
        return current = createFiberFromPortal(portal, returnFiber.mode, lanes), current.return = returnFiber, current;
      current = useFiber(current, portal.children || []);
      current.return = returnFiber;
      return current;
    }
    function updateFragment(returnFiber, current, fragment, lanes, key) {
      if (null === current || 7 !== current.tag)
        return current = createFiberFromFragment(
          fragment,
          returnFiber.mode,
          lanes,
          key
        ), current.return = returnFiber, current;
      current = useFiber(current, fragment);
      current.return = returnFiber;
      return current;
    }
    function createChild(returnFiber, newChild, lanes) {
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return newChild = createFiberFromText(
          "" + newChild,
          returnFiber.mode,
          lanes
        ), newChild.return = returnFiber, newChild;
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return lanes = createFiberFromTypeAndProps(
              newChild.type,
              newChild.key,
              newChild.props,
              null,
              returnFiber.mode,
              lanes
            ), coerceRef(lanes, newChild), lanes.return = returnFiber, lanes;
          case REACT_PORTAL_TYPE:
            return newChild = createFiberFromPortal(
              newChild,
              returnFiber.mode,
              lanes
            ), newChild.return = returnFiber, newChild;
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), createChild(returnFiber, newChild, lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return newChild = createFiberFromFragment(
            newChild,
            returnFiber.mode,
            lanes,
            null
          ), newChild.return = returnFiber, newChild;
        if ("function" === typeof newChild.then)
          return createChild(returnFiber, unwrapThenable(newChild), lanes);
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return createChild(
            returnFiber,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function updateSlot(returnFiber, oldFiber, newChild, lanes) {
      var key = null !== oldFiber ? oldFiber.key : null;
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return null !== key ? null : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return newChild.key === key ? updateElement(returnFiber, oldFiber, newChild, lanes) : null;
          case REACT_PORTAL_TYPE:
            return newChild.key === key ? updatePortal(returnFiber, oldFiber, newChild, lanes) : null;
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), updateSlot(returnFiber, oldFiber, newChild, lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return null !== key ? null : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
        if ("function" === typeof newChild.then)
          return updateSlot(
            returnFiber,
            oldFiber,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateSlot(
            returnFiber,
            oldFiber,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return existingChildren = existingChildren.get(newIdx) || null, updateTextNode(returnFiber, existingChildren, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return existingChildren = existingChildren.get(
              null === newChild.key ? newIdx : newChild.key
            ) || null, updateElement(returnFiber, existingChildren, newChild, lanes);
          case REACT_PORTAL_TYPE:
            return existingChildren = existingChildren.get(
              null === newChild.key ? newIdx : newChild.key
            ) || null, updatePortal(returnFiber, existingChildren, newChild, lanes);
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              newChild,
              lanes
            );
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return existingChildren = existingChildren.get(newIdx) || null, updateFragment(returnFiber, existingChildren, newChild, lanes, null);
        if ("function" === typeof newChild.then)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
      for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null; null !== oldFiber && newIdx < newChildren.length; newIdx++) {
        oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
        var newFiber = updateSlot(
          returnFiber,
          oldFiber,
          newChildren[newIdx],
          lanes
        );
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (newIdx === newChildren.length)
        return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
      if (null === oldFiber) {
        for (; newIdx < newChildren.length; newIdx++)
          oldFiber = createChild(returnFiber, newChildren[newIdx], lanes), null !== oldFiber && (currentFirstChild = placeChild(
            oldFiber,
            currentFirstChild,
            newIdx
          ), null === previousNewFiber ? resultingFirstChild = oldFiber : previousNewFiber.sibling = oldFiber, previousNewFiber = oldFiber);
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (oldFiber = mapRemainingChildren(oldFiber); newIdx < newChildren.length; newIdx++)
        nextOldFiber = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          newChildren[newIdx],
          lanes
        ), null !== nextOldFiber && (shouldTrackSideEffects && null !== nextOldFiber.alternate && oldFiber.delete(
          null === nextOldFiber.key ? newIdx : nextOldFiber.key
        ), currentFirstChild = placeChild(
          nextOldFiber,
          currentFirstChild,
          newIdx
        ), null === previousNewFiber ? resultingFirstChild = nextOldFiber : previousNewFiber.sibling = nextOldFiber, previousNewFiber = nextOldFiber);
      shouldTrackSideEffects && oldFiber.forEach(function(child) {
        return deleteChild(returnFiber, child);
      });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes) {
      if (null == newChildren) throw Error(formatProdErrorMessage(151));
      for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null, step = newChildren.next(); null !== oldFiber && !step.done; newIdx++, step = newChildren.next()) {
        oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
        var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (step.done)
        return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
      if (null === oldFiber) {
        for (; !step.done; newIdx++, step = newChildren.next())
          step = createChild(returnFiber, step.value, lanes), null !== step && (currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (oldFiber = mapRemainingChildren(oldFiber); !step.done; newIdx++, step = newChildren.next())
        step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes), null !== step && (shouldTrackSideEffects && null !== step.alternate && oldFiber.delete(null === step.key ? newIdx : step.key), currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
      shouldTrackSideEffects && oldFiber.forEach(function(child) {
        return deleteChild(returnFiber, child);
      });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes) {
      "object" === typeof newChild && null !== newChild && newChild.type === REACT_FRAGMENT_TYPE && null === newChild.key && (newChild = newChild.props.children);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            a: {
              for (var key = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === key) {
                  key = newChild.type;
                  if (key === REACT_FRAGMENT_TYPE) {
                    if (7 === currentFirstChild.tag) {
                      deleteRemainingChildren(
                        returnFiber,
                        currentFirstChild.sibling
                      );
                      lanes = useFiber(
                        currentFirstChild,
                        newChild.props.children
                      );
                      lanes.return = returnFiber;
                      returnFiber = lanes;
                      break a;
                    }
                  } else if (currentFirstChild.elementType === key || "object" === typeof key && null !== key && key.$$typeof === REACT_LAZY_TYPE && resolveLazy(key) === currentFirstChild.type) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(currentFirstChild, newChild.props);
                    coerceRef(lanes, newChild);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  }
                  deleteRemainingChildren(returnFiber, currentFirstChild);
                  break;
                } else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              newChild.type === REACT_FRAGMENT_TYPE ? (lanes = createFiberFromFragment(
                newChild.props.children,
                returnFiber.mode,
                lanes,
                newChild.key
              ), lanes.return = returnFiber, returnFiber = lanes) : (lanes = createFiberFromTypeAndProps(
                newChild.type,
                newChild.key,
                newChild.props,
                null,
                returnFiber.mode,
                lanes
              ), coerceRef(lanes, newChild), lanes.return = returnFiber, returnFiber = lanes);
            }
            return placeSingleChild(returnFiber);
          case REACT_PORTAL_TYPE:
            a: {
              for (key = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === key)
                  if (4 === currentFirstChild.tag && currentFirstChild.stateNode.containerInfo === newChild.containerInfo && currentFirstChild.stateNode.implementation === newChild.implementation) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(currentFirstChild, newChild.children || []);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  } else {
                    deleteRemainingChildren(returnFiber, currentFirstChild);
                    break;
                  }
                else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              lanes = createFiberFromPortal(newChild, returnFiber.mode, lanes);
              lanes.return = returnFiber;
              returnFiber = lanes;
            }
            return placeSingleChild(returnFiber);
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), reconcileChildFibersImpl(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            );
        }
        if (isArrayImpl(newChild))
          return reconcileChildrenArray(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        if (getIteratorFn(newChild)) {
          key = getIteratorFn(newChild);
          if ("function" !== typeof key) throw Error(formatProdErrorMessage(150));
          newChild = key.call(newChild);
          return reconcileChildrenIterator(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        }
        if ("function" === typeof newChild.then)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return "string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild ? (newChild = "" + newChild, null !== currentFirstChild && 6 === currentFirstChild.tag ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling), lanes = useFiber(currentFirstChild, newChild), lanes.return = returnFiber, returnFiber = lanes) : (deleteRemainingChildren(returnFiber, currentFirstChild), lanes = createFiberFromText(newChild, returnFiber.mode, lanes), lanes.return = returnFiber, returnFiber = lanes), placeSingleChild(returnFiber)) : deleteRemainingChildren(returnFiber, currentFirstChild);
    }
    return function(returnFiber, currentFirstChild, newChild, lanes) {
      try {
        thenableIndexCounter$1 = 0;
        var firstChildFiber = reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
        thenableState$1 = null;
        return firstChildFiber;
      } catch (x) {
        if (x === SuspenseException || x === SuspenseActionException) throw x;
        var fiber = createFiberImplClass(29, x, null, returnFiber.mode);
        fiber.lanes = lanes;
        fiber.return = returnFiber;
        return fiber;
      } finally {
      }
    };
  }
  var reconcileChildFibers = createChildReconciler(true), mountChildFibers = createChildReconciler(false), hasForceUpdate = false;
  function initializeUpdateQueue(fiber) {
    fiber.updateQueue = {
      baseState: fiber.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function cloneUpdateQueue(current, workInProgress2) {
    current = current.updateQueue;
    workInProgress2.updateQueue === current && (workInProgress2.updateQueue = {
      baseState: current.baseState,
      firstBaseUpdate: current.firstBaseUpdate,
      lastBaseUpdate: current.lastBaseUpdate,
      shared: current.shared,
      callbacks: null
    });
  }
  function createUpdate(lane) {
    return { lane, tag: 0, payload: null, callback: null, next: null };
  }
  function enqueueUpdate(fiber, update, lane) {
    var updateQueue = fiber.updateQueue;
    if (null === updateQueue) return null;
    updateQueue = updateQueue.shared;
    if (0 !== (executionContext & 2)) {
      var pending = updateQueue.pending;
      null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
      updateQueue.pending = update;
      update = getRootForUpdatedFiber(fiber);
      markUpdateLaneFromFiberToRoot(fiber, null, lane);
      return update;
    }
    enqueueUpdate$1(fiber, updateQueue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function entangleTransitions(root2, fiber, lane) {
    fiber = fiber.updateQueue;
    if (null !== fiber && (fiber = fiber.shared, 0 !== (lane & 4194048))) {
      var queueLanes = fiber.lanes;
      queueLanes &= root2.pendingLanes;
      lane |= queueLanes;
      fiber.lanes = lane;
      markRootEntangled(root2, lane);
    }
  }
  function enqueueCapturedUpdate(workInProgress2, capturedUpdate) {
    var queue = workInProgress2.updateQueue, current = workInProgress2.alternate;
    if (null !== current && (current = current.updateQueue, queue === current)) {
      var newFirst = null, newLast = null;
      queue = queue.firstBaseUpdate;
      if (null !== queue) {
        do {
          var clone = {
            lane: queue.lane,
            tag: queue.tag,
            payload: queue.payload,
            callback: null,
            next: null
          };
          null === newLast ? newFirst = newLast = clone : newLast = newLast.next = clone;
          queue = queue.next;
        } while (null !== queue);
        null === newLast ? newFirst = newLast = capturedUpdate : newLast = newLast.next = capturedUpdate;
      } else newFirst = newLast = capturedUpdate;
      queue = {
        baseState: current.baseState,
        firstBaseUpdate: newFirst,
        lastBaseUpdate: newLast,
        shared: current.shared,
        callbacks: current.callbacks
      };
      workInProgress2.updateQueue = queue;
      return;
    }
    workInProgress2 = queue.lastBaseUpdate;
    null === workInProgress2 ? queue.firstBaseUpdate = capturedUpdate : workInProgress2.next = capturedUpdate;
    queue.lastBaseUpdate = capturedUpdate;
  }
  var didReadFromEntangledAsyncAction = false;
  function suspendIfUpdateReadFromEntangledAsyncAction() {
    if (didReadFromEntangledAsyncAction) {
      var entangledActionThenable = currentEntangledActionThenable;
      if (null !== entangledActionThenable) throw entangledActionThenable;
    }
  }
  function processUpdateQueue(workInProgress$jscomp$0, props, instance$jscomp$0, renderLanes2) {
    didReadFromEntangledAsyncAction = false;
    var queue = workInProgress$jscomp$0.updateQueue;
    hasForceUpdate = false;
    var firstBaseUpdate = queue.firstBaseUpdate, lastBaseUpdate = queue.lastBaseUpdate, pendingQueue = queue.shared.pending;
    if (null !== pendingQueue) {
      queue.shared.pending = null;
      var lastPendingUpdate = pendingQueue, firstPendingUpdate = lastPendingUpdate.next;
      lastPendingUpdate.next = null;
      null === lastBaseUpdate ? firstBaseUpdate = firstPendingUpdate : lastBaseUpdate.next = firstPendingUpdate;
      lastBaseUpdate = lastPendingUpdate;
      var current = workInProgress$jscomp$0.alternate;
      null !== current && (current = current.updateQueue, pendingQueue = current.lastBaseUpdate, pendingQueue !== lastBaseUpdate && (null === pendingQueue ? current.firstBaseUpdate = firstPendingUpdate : pendingQueue.next = firstPendingUpdate, current.lastBaseUpdate = lastPendingUpdate));
    }
    if (null !== firstBaseUpdate) {
      var newState = queue.baseState;
      lastBaseUpdate = 0;
      current = firstPendingUpdate = lastPendingUpdate = null;
      pendingQueue = firstBaseUpdate;
      do {
        var updateLane = pendingQueue.lane & -536870913, isHiddenUpdate = updateLane !== pendingQueue.lane;
        if (isHiddenUpdate ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes2 & updateLane) === updateLane) {
          0 !== updateLane && updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction = true);
          null !== current && (current = current.next = {
            lane: 0,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: null,
            next: null
          });
          a: {
            var workInProgress2 = workInProgress$jscomp$0, update = pendingQueue;
            updateLane = props;
            var instance = instance$jscomp$0;
            switch (update.tag) {
              case 1:
                workInProgress2 = update.payload;
                if ("function" === typeof workInProgress2) {
                  newState = workInProgress2.call(instance, newState, updateLane);
                  break a;
                }
                newState = workInProgress2;
                break a;
              case 3:
                workInProgress2.flags = workInProgress2.flags & -65537 | 128;
              case 0:
                workInProgress2 = update.payload;
                updateLane = "function" === typeof workInProgress2 ? workInProgress2.call(instance, newState, updateLane) : workInProgress2;
                if (null === updateLane || void 0 === updateLane) break a;
                newState = assign({}, newState, updateLane);
                break a;
              case 2:
                hasForceUpdate = true;
            }
          }
          updateLane = pendingQueue.callback;
          null !== updateLane && (workInProgress$jscomp$0.flags |= 64, isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192), isHiddenUpdate = queue.callbacks, null === isHiddenUpdate ? queue.callbacks = [updateLane] : isHiddenUpdate.push(updateLane));
        } else
          isHiddenUpdate = {
            lane: updateLane,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: pendingQueue.callback,
            next: null
          }, null === current ? (firstPendingUpdate = current = isHiddenUpdate, lastPendingUpdate = newState) : current = current.next = isHiddenUpdate, lastBaseUpdate |= updateLane;
        pendingQueue = pendingQueue.next;
        if (null === pendingQueue)
          if (pendingQueue = queue.shared.pending, null === pendingQueue)
            break;
          else
            isHiddenUpdate = pendingQueue, pendingQueue = isHiddenUpdate.next, isHiddenUpdate.next = null, queue.lastBaseUpdate = isHiddenUpdate, queue.shared.pending = null;
      } while (1);
      null === current && (lastPendingUpdate = newState);
      queue.baseState = lastPendingUpdate;
      queue.firstBaseUpdate = firstPendingUpdate;
      queue.lastBaseUpdate = current;
      null === firstBaseUpdate && (queue.shared.lanes = 0);
      workInProgressRootSkippedLanes |= lastBaseUpdate;
      workInProgress$jscomp$0.lanes = lastBaseUpdate;
      workInProgress$jscomp$0.memoizedState = newState;
    }
  }
  function callCallback(callback, context) {
    if ("function" !== typeof callback)
      throw Error(formatProdErrorMessage(191, callback));
    callback.call(context);
  }
  function commitCallbacks(updateQueue, context) {
    var callbacks = updateQueue.callbacks;
    if (null !== callbacks)
      for (updateQueue.callbacks = null, updateQueue = 0; updateQueue < callbacks.length; updateQueue++)
        callCallback(callbacks[updateQueue], context);
  }
  var currentTreeHiddenStackCursor = createCursor(null), prevEntangledRenderLanesCursor = createCursor(0);
  function pushHiddenContext(fiber, context) {
    fiber = entangledRenderLanes;
    push(prevEntangledRenderLanesCursor, fiber);
    push(currentTreeHiddenStackCursor, context);
    entangledRenderLanes = fiber | context.baseLanes;
  }
  function reuseHiddenContextOnStack() {
    push(prevEntangledRenderLanesCursor, entangledRenderLanes);
    push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
  }
  function popHiddenContext() {
    entangledRenderLanes = prevEntangledRenderLanesCursor.current;
    pop(currentTreeHiddenStackCursor);
    pop(prevEntangledRenderLanesCursor);
  }
  var suspenseHandlerStackCursor = createCursor(null), shellBoundary = null;
  function pushPrimaryTreeSuspenseHandler(handler) {
    var current = handler.alternate;
    push(suspenseStackCursor, suspenseStackCursor.current & 1);
    push(suspenseHandlerStackCursor, handler);
    null === shellBoundary && (null === current || null !== currentTreeHiddenStackCursor.current ? shellBoundary = handler : null !== current.memoizedState && (shellBoundary = handler));
  }
  function pushDehydratedActivitySuspenseHandler(fiber) {
    push(suspenseStackCursor, suspenseStackCursor.current);
    push(suspenseHandlerStackCursor, fiber);
    null === shellBoundary && (shellBoundary = fiber);
  }
  function pushOffscreenSuspenseHandler(fiber) {
    22 === fiber.tag ? (push(suspenseStackCursor, suspenseStackCursor.current), push(suspenseHandlerStackCursor, fiber), null === shellBoundary && (shellBoundary = fiber)) : reuseSuspenseHandlerOnStack();
  }
  function reuseSuspenseHandlerOnStack() {
    push(suspenseStackCursor, suspenseStackCursor.current);
    push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
  }
  function popSuspenseHandler(fiber) {
    pop(suspenseHandlerStackCursor);
    shellBoundary === fiber && (shellBoundary = null);
    pop(suspenseStackCursor);
  }
  var suspenseStackCursor = createCursor(0);
  function findFirstSuspended(row) {
    for (var node = row; null !== node; ) {
      if (13 === node.tag) {
        var state = node.memoizedState;
        if (null !== state && (state = state.dehydrated, null === state || isSuspenseInstancePending(state) || isSuspenseInstanceFallback(state)))
          return node;
      } else if (19 === node.tag && ("forwards" === node.memoizedProps.revealOrder || "backwards" === node.memoizedProps.revealOrder || "unstable_legacy-backwards" === node.memoizedProps.revealOrder || "together" === node.memoizedProps.revealOrder)) {
        if (0 !== (node.flags & 128)) return node;
      } else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === row) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === row) return null;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
    return null;
  }
  var renderLanes = 0, currentlyRenderingFiber = null, currentHook = null, workInProgressHook = null, didScheduleRenderPhaseUpdate = false, didScheduleRenderPhaseUpdateDuringThisPass = false, shouldDoubleInvokeUserFnsInHooksDEV = false, localIdCounter = 0, thenableIndexCounter = 0, thenableState = null, globalClientIdCounter = 0;
  function throwInvalidHookError() {
    throw Error(formatProdErrorMessage(321));
  }
  function areHookInputsEqual(nextDeps, prevDeps) {
    if (null === prevDeps) return false;
    for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
      if (!objectIs(nextDeps[i], prevDeps[i])) return false;
    return true;
  }
  function renderWithHooks(current, workInProgress2, Component, props, secondArg, nextRenderLanes) {
    renderLanes = nextRenderLanes;
    currentlyRenderingFiber = workInProgress2;
    workInProgress2.memoizedState = null;
    workInProgress2.updateQueue = null;
    workInProgress2.lanes = 0;
    ReactSharedInternals.H = null === current || null === current.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
    shouldDoubleInvokeUserFnsInHooksDEV = false;
    nextRenderLanes = Component(props, secondArg);
    shouldDoubleInvokeUserFnsInHooksDEV = false;
    didScheduleRenderPhaseUpdateDuringThisPass && (nextRenderLanes = renderWithHooksAgain(
      workInProgress2,
      Component,
      props,
      secondArg
    ));
    finishRenderingHooks(current);
    return nextRenderLanes;
  }
  function finishRenderingHooks(current) {
    ReactSharedInternals.H = ContextOnlyDispatcher;
    var didRenderTooFewHooks = null !== currentHook && null !== currentHook.next;
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdate = false;
    thenableIndexCounter = 0;
    thenableState = null;
    if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
    null === current || didReceiveUpdate || (current = current.dependencies, null !== current && checkIfContextChanged(current) && (didReceiveUpdate = true));
  }
  function renderWithHooksAgain(workInProgress2, Component, props, secondArg) {
    currentlyRenderingFiber = workInProgress2;
    var numberOfReRenders = 0;
    do {
      didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
      thenableIndexCounter = 0;
      didScheduleRenderPhaseUpdateDuringThisPass = false;
      if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
      numberOfReRenders += 1;
      workInProgressHook = currentHook = null;
      if (null != workInProgress2.updateQueue) {
        var children = workInProgress2.updateQueue;
        children.lastEffect = null;
        children.events = null;
        children.stores = null;
        null != children.memoCache && (children.memoCache.index = 0);
      }
      ReactSharedInternals.H = HooksDispatcherOnRerender;
      children = Component(props, secondArg);
    } while (didScheduleRenderPhaseUpdateDuringThisPass);
    return children;
  }
  function TransitionAwareHostComponent() {
    var dispatcher = ReactSharedInternals.H, maybeThenable = dispatcher.useState()[0];
    maybeThenable = "function" === typeof maybeThenable.then ? useThenable(maybeThenable) : maybeThenable;
    dispatcher = dispatcher.useState()[0];
    (null !== currentHook ? currentHook.memoizedState : null) !== dispatcher && (currentlyRenderingFiber.flags |= 1024);
    return maybeThenable;
  }
  function checkDidRenderIdHook() {
    var didRenderIdHook = 0 !== localIdCounter;
    localIdCounter = 0;
    return didRenderIdHook;
  }
  function bailoutHooks(current, workInProgress2, lanes) {
    workInProgress2.updateQueue = current.updateQueue;
    workInProgress2.flags &= -2053;
    current.lanes &= ~lanes;
  }
  function resetHooksOnUnwind(workInProgress2) {
    if (didScheduleRenderPhaseUpdate) {
      for (workInProgress2 = workInProgress2.memoizedState; null !== workInProgress2; ) {
        var queue = workInProgress2.queue;
        null !== queue && (queue.pending = null);
        workInProgress2 = workInProgress2.next;
      }
      didScheduleRenderPhaseUpdate = false;
    }
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdateDuringThisPass = false;
    thenableIndexCounter = localIdCounter = 0;
    thenableState = null;
  }
  function mountWorkInProgressHook() {
    var hook = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = hook : workInProgressHook = workInProgressHook.next = hook;
    return workInProgressHook;
  }
  function updateWorkInProgressHook() {
    if (null === currentHook) {
      var nextCurrentHook = currentlyRenderingFiber.alternate;
      nextCurrentHook = null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
    } else nextCurrentHook = currentHook.next;
    var nextWorkInProgressHook = null === workInProgressHook ? currentlyRenderingFiber.memoizedState : workInProgressHook.next;
    if (null !== nextWorkInProgressHook)
      workInProgressHook = nextWorkInProgressHook, currentHook = nextCurrentHook;
    else {
      if (null === nextCurrentHook) {
        if (null === currentlyRenderingFiber.alternate)
          throw Error(formatProdErrorMessage(467));
        throw Error(formatProdErrorMessage(310));
      }
      currentHook = nextCurrentHook;
      nextCurrentHook = {
        memoizedState: currentHook.memoizedState,
        baseState: currentHook.baseState,
        baseQueue: currentHook.baseQueue,
        queue: currentHook.queue,
        next: null
      };
      null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = nextCurrentHook : workInProgressHook = workInProgressHook.next = nextCurrentHook;
    }
    return workInProgressHook;
  }
  function createFunctionComponentUpdateQueue() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function useThenable(thenable) {
    var index2 = thenableIndexCounter;
    thenableIndexCounter += 1;
    null === thenableState && (thenableState = []);
    thenable = trackUsedThenable(thenableState, thenable, index2);
    index2 = currentlyRenderingFiber;
    null === (null === workInProgressHook ? index2.memoizedState : workInProgressHook.next) && (index2 = index2.alternate, ReactSharedInternals.H = null === index2 || null === index2.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate);
    return thenable;
  }
  function use(usable) {
    if (null !== usable && "object" === typeof usable) {
      if ("function" === typeof usable.then) return useThenable(usable);
      if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
    }
    throw Error(formatProdErrorMessage(438, String(usable)));
  }
  function useMemoCache(size) {
    var memoCache = null, updateQueue = currentlyRenderingFiber.updateQueue;
    null !== updateQueue && (memoCache = updateQueue.memoCache);
    if (null == memoCache) {
      var current = currentlyRenderingFiber.alternate;
      null !== current && (current = current.updateQueue, null !== current && (current = current.memoCache, null != current && (memoCache = {
        data: current.data.map(function(array) {
          return array.slice();
        }),
        index: 0
      })));
    }
    null == memoCache && (memoCache = { data: [], index: 0 });
    null === updateQueue && (updateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = updateQueue);
    updateQueue.memoCache = memoCache;
    updateQueue = memoCache.data[memoCache.index];
    if (void 0 === updateQueue)
      for (updateQueue = memoCache.data[memoCache.index] = Array(size), current = 0; current < size; current++)
        updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
    memoCache.index++;
    return updateQueue;
  }
  function basicStateReducer(state, action) {
    return "function" === typeof action ? action(state) : action;
  }
  function updateReducer(reducer) {
    var hook = updateWorkInProgressHook();
    return updateReducerImpl(hook, currentHook, reducer);
  }
  function updateReducerImpl(hook, current, reducer) {
    var queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var baseQueue = hook.baseQueue, pendingQueue = queue.pending;
    if (null !== pendingQueue) {
      if (null !== baseQueue) {
        var baseFirst = baseQueue.next;
        baseQueue.next = pendingQueue.next;
        pendingQueue.next = baseFirst;
      }
      current.baseQueue = baseQueue = pendingQueue;
      queue.pending = null;
    }
    pendingQueue = hook.baseState;
    if (null === baseQueue) hook.memoizedState = pendingQueue;
    else {
      current = baseQueue.next;
      var newBaseQueueFirst = baseFirst = null, newBaseQueueLast = null, update = current, didReadFromEntangledAsyncAction$60 = false;
      do {
        var updateLane = update.lane & -536870913;
        if (updateLane !== update.lane ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes & updateLane) === updateLane) {
          var revertLane = update.revertLane;
          if (0 === revertLane)
            null !== newBaseQueueLast && (newBaseQueueLast = newBaseQueueLast.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }), updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction$60 = true);
          else if ((renderLanes & revertLane) === revertLane) {
            update = update.next;
            revertLane === currentEntangledLane && (didReadFromEntangledAsyncAction$60 = true);
            continue;
          } else
            updateLane = {
              lane: 0,
              revertLane: update.revertLane,
              gesture: null,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = updateLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = updateLane, currentlyRenderingFiber.lanes |= revertLane, workInProgressRootSkippedLanes |= revertLane;
          updateLane = update.action;
          shouldDoubleInvokeUserFnsInHooksDEV && reducer(pendingQueue, updateLane);
          pendingQueue = update.hasEagerState ? update.eagerState : reducer(pendingQueue, updateLane);
        } else
          revertLane = {
            lane: updateLane,
            revertLane: update.revertLane,
            gesture: update.gesture,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          }, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = revertLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = revertLane, currentlyRenderingFiber.lanes |= updateLane, workInProgressRootSkippedLanes |= updateLane;
        update = update.next;
      } while (null !== update && update !== current);
      null === newBaseQueueLast ? baseFirst = pendingQueue : newBaseQueueLast.next = newBaseQueueFirst;
      if (!objectIs(pendingQueue, hook.memoizedState) && (didReceiveUpdate = true, didReadFromEntangledAsyncAction$60 && (reducer = currentEntangledActionThenable, null !== reducer)))
        throw reducer;
      hook.memoizedState = pendingQueue;
      hook.baseState = baseFirst;
      hook.baseQueue = newBaseQueueLast;
      queue.lastRenderedState = pendingQueue;
    }
    null === baseQueue && (queue.lanes = 0);
    return [hook.memoizedState, queue.dispatch];
  }
  function rerenderReducer(reducer) {
    var hook = updateWorkInProgressHook(), queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var dispatch = queue.dispatch, lastRenderPhaseUpdate = queue.pending, newState = hook.memoizedState;
    if (null !== lastRenderPhaseUpdate) {
      queue.pending = null;
      var update = lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      do
        newState = reducer(newState, update.action), update = update.next;
      while (update !== lastRenderPhaseUpdate);
      objectIs(newState, hook.memoizedState) || (didReceiveUpdate = true);
      hook.memoizedState = newState;
      null === hook.baseQueue && (hook.baseState = newState);
      queue.lastRenderedState = newState;
    }
    return [newState, dispatch];
  }
  function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var fiber = currentlyRenderingFiber, hook = updateWorkInProgressHook(), isHydrating$jscomp$0 = isHydrating;
    if (isHydrating$jscomp$0) {
      if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
      getServerSnapshot = getServerSnapshot();
    } else getServerSnapshot = getSnapshot();
    var snapshotChanged = !objectIs(
      (currentHook || hook).memoizedState,
      getServerSnapshot
    );
    snapshotChanged && (hook.memoizedState = getServerSnapshot, didReceiveUpdate = true);
    hook = hook.queue;
    updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [
      subscribe
    ]);
    if (hook.getSnapshot !== getSnapshot || snapshotChanged || null !== workInProgressHook && workInProgressHook.memoizedState.tag & 1) {
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(
          null,
          fiber,
          hook,
          getServerSnapshot,
          getSnapshot
        ),
        null
      );
      if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
      isHydrating$jscomp$0 || 0 !== (renderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
    }
    return getServerSnapshot;
  }
  function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
    fiber.flags |= 16384;
    fiber = { getSnapshot, value: renderedSnapshot };
    getSnapshot = currentlyRenderingFiber.updateQueue;
    null === getSnapshot ? (getSnapshot = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = getSnapshot, getSnapshot.stores = [fiber]) : (renderedSnapshot = getSnapshot.stores, null === renderedSnapshot ? getSnapshot.stores = [fiber] : renderedSnapshot.push(fiber));
  }
  function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
    inst.value = nextSnapshot;
    inst.getSnapshot = getSnapshot;
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
  }
  function subscribeToStore(fiber, inst, subscribe) {
    return subscribe(function() {
      checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
    });
  }
  function checkIfSnapshotChanged(inst) {
    var latestGetSnapshot = inst.getSnapshot;
    inst = inst.value;
    try {
      var nextValue = latestGetSnapshot();
      return !objectIs(inst, nextValue);
    } catch (error) {
      return true;
    }
  }
  function forceStoreRerender(fiber) {
    var root2 = enqueueConcurrentRenderForLane(fiber, 2);
    null !== root2 && scheduleUpdateOnFiber(root2, fiber, 2);
  }
  function mountStateImpl(initialState) {
    var hook = mountWorkInProgressHook();
    if ("function" === typeof initialState) {
      var initialStateInitializer = initialState;
      initialState = initialStateInitializer();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          initialStateInitializer();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
    }
    hook.memoizedState = hook.baseState = initialState;
    hook.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialState
    };
    return hook;
  }
  function updateOptimisticImpl(hook, current, passthrough, reducer) {
    hook.baseState = passthrough;
    return updateReducerImpl(
      hook,
      currentHook,
      "function" === typeof reducer ? reducer : basicStateReducer
    );
  }
  function dispatchActionState(fiber, actionQueue, setPendingState, setState, payload) {
    if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
    fiber = actionQueue.action;
    if (null !== fiber) {
      var actionNode = {
        payload,
        action: fiber,
        next: null,
        isTransition: true,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(listener) {
          actionNode.listeners.push(listener);
        }
      };
      null !== ReactSharedInternals.T ? setPendingState(true) : actionNode.isTransition = false;
      setState(actionNode);
      setPendingState = actionQueue.pending;
      null === setPendingState ? (actionNode.next = actionQueue.pending = actionNode, runActionStateAction(actionQueue, actionNode)) : (actionNode.next = setPendingState.next, actionQueue.pending = setPendingState.next = actionNode);
    }
  }
  function runActionStateAction(actionQueue, node) {
    var action = node.action, payload = node.payload, prevState = actionQueue.state;
    if (node.isTransition) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = action(prevState, payload), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        handleActionReturnValue(actionQueue, node, returnValue);
      } catch (error) {
        onActionError(actionQueue, node, error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    } else
      try {
        prevTransition = action(prevState, payload), handleActionReturnValue(actionQueue, node, prevTransition);
      } catch (error$66) {
        onActionError(actionQueue, node, error$66);
      }
  }
  function handleActionReturnValue(actionQueue, node, returnValue) {
    null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then ? returnValue.then(
      function(nextState) {
        onActionSuccess(actionQueue, node, nextState);
      },
      function(error) {
        return onActionError(actionQueue, node, error);
      }
    ) : onActionSuccess(actionQueue, node, returnValue);
  }
  function onActionSuccess(actionQueue, actionNode, nextState) {
    actionNode.status = "fulfilled";
    actionNode.value = nextState;
    notifyActionListeners(actionNode);
    actionQueue.state = nextState;
    actionNode = actionQueue.pending;
    null !== actionNode && (nextState = actionNode.next, nextState === actionNode ? actionQueue.pending = null : (nextState = nextState.next, actionNode.next = nextState, runActionStateAction(actionQueue, nextState)));
  }
  function onActionError(actionQueue, actionNode, error) {
    var last = actionQueue.pending;
    actionQueue.pending = null;
    if (null !== last) {
      last = last.next;
      do
        actionNode.status = "rejected", actionNode.reason = error, notifyActionListeners(actionNode), actionNode = actionNode.next;
      while (actionNode !== last);
    }
    actionQueue.action = null;
  }
  function notifyActionListeners(actionNode) {
    actionNode = actionNode.listeners;
    for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
  }
  function actionStateReducer(oldState, newState) {
    return newState;
  }
  function mountActionState(action, initialStateProp) {
    if (isHydrating) {
      var ssrFormState = workInProgressRoot.formState;
      if (null !== ssrFormState) {
        a: {
          var JSCompiler_inline_result = currentlyRenderingFiber;
          if (isHydrating) {
            if (nextHydratableInstance) {
              b: {
                var JSCompiler_inline_result$jscomp$0 = nextHydratableInstance;
                for (var inRootOrSingleton = rootOrSingletonContext; 8 !== JSCompiler_inline_result$jscomp$0.nodeType; ) {
                  if (!inRootOrSingleton) {
                    JSCompiler_inline_result$jscomp$0 = null;
                    break b;
                  }
                  JSCompiler_inline_result$jscomp$0 = getNextHydratable(
                    JSCompiler_inline_result$jscomp$0.nextSibling
                  );
                  if (null === JSCompiler_inline_result$jscomp$0) {
                    JSCompiler_inline_result$jscomp$0 = null;
                    break b;
                  }
                }
                inRootOrSingleton = JSCompiler_inline_result$jscomp$0.data;
                JSCompiler_inline_result$jscomp$0 = "F!" === inRootOrSingleton || "F" === inRootOrSingleton ? JSCompiler_inline_result$jscomp$0 : null;
              }
              if (JSCompiler_inline_result$jscomp$0) {
                nextHydratableInstance = getNextHydratable(
                  JSCompiler_inline_result$jscomp$0.nextSibling
                );
                JSCompiler_inline_result = "F!" === JSCompiler_inline_result$jscomp$0.data;
                break a;
              }
            }
            throwOnHydrationMismatch(JSCompiler_inline_result);
          }
          JSCompiler_inline_result = false;
        }
        JSCompiler_inline_result && (initialStateProp = ssrFormState[0]);
      }
    }
    ssrFormState = mountWorkInProgressHook();
    ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
    JSCompiler_inline_result = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: actionStateReducer,
      lastRenderedState: initialStateProp
    };
    ssrFormState.queue = JSCompiler_inline_result;
    ssrFormState = dispatchSetState.bind(
      null,
      currentlyRenderingFiber,
      JSCompiler_inline_result
    );
    JSCompiler_inline_result.dispatch = ssrFormState;
    JSCompiler_inline_result = mountStateImpl(false);
    inRootOrSingleton = dispatchOptimisticSetState.bind(
      null,
      currentlyRenderingFiber,
      false,
      JSCompiler_inline_result.queue
    );
    JSCompiler_inline_result = mountWorkInProgressHook();
    JSCompiler_inline_result$jscomp$0 = {
      state: initialStateProp,
      dispatch: null,
      action,
      pending: null
    };
    JSCompiler_inline_result.queue = JSCompiler_inline_result$jscomp$0;
    ssrFormState = dispatchActionState.bind(
      null,
      currentlyRenderingFiber,
      JSCompiler_inline_result$jscomp$0,
      inRootOrSingleton,
      ssrFormState
    );
    JSCompiler_inline_result$jscomp$0.dispatch = ssrFormState;
    JSCompiler_inline_result.memoizedState = action;
    return [initialStateProp, ssrFormState, false];
  }
  function updateActionState(action) {
    var stateHook = updateWorkInProgressHook();
    return updateActionStateImpl(stateHook, currentHook, action);
  }
  function updateActionStateImpl(stateHook, currentStateHook, action) {
    currentStateHook = updateReducerImpl(
      stateHook,
      currentStateHook,
      actionStateReducer
    )[0];
    stateHook = updateReducer(basicStateReducer)[0];
    if ("object" === typeof currentStateHook && null !== currentStateHook && "function" === typeof currentStateHook.then)
      try {
        var state = useThenable(currentStateHook);
      } catch (x) {
        if (x === SuspenseException) throw SuspenseActionException;
        throw x;
      }
    else state = currentStateHook;
    currentStateHook = updateWorkInProgressHook();
    var actionQueue = currentStateHook.queue, dispatch = actionQueue.dispatch;
    action !== currentStateHook.memoizedState && (currentlyRenderingFiber.flags |= 2048, pushSimpleEffect(
      9,
      { destroy: void 0 },
      actionStateActionEffect.bind(null, actionQueue, action),
      null
    ));
    return [state, dispatch, stateHook];
  }
  function actionStateActionEffect(actionQueue, action) {
    actionQueue.action = action;
  }
  function rerenderActionState(action) {
    var stateHook = updateWorkInProgressHook(), currentStateHook = currentHook;
    if (null !== currentStateHook)
      return updateActionStateImpl(stateHook, currentStateHook, action);
    updateWorkInProgressHook();
    stateHook = stateHook.memoizedState;
    currentStateHook = updateWorkInProgressHook();
    var dispatch = currentStateHook.queue.dispatch;
    currentStateHook.memoizedState = action;
    return [stateHook, dispatch, false];
  }
  function pushSimpleEffect(tag, inst, create, deps) {
    tag = { tag, create, deps, inst, next: null };
    inst = currentlyRenderingFiber.updateQueue;
    null === inst && (inst = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = inst);
    create = inst.lastEffect;
    null === create ? inst.lastEffect = tag.next = tag : (deps = create.next, create.next = tag, tag.next = deps, inst.lastEffect = tag);
    return tag;
  }
  function updateRef() {
    return updateWorkInProgressHook().memoizedState;
  }
  function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = mountWorkInProgressHook();
    currentlyRenderingFiber.flags |= fiberFlags;
    hook.memoizedState = pushSimpleEffect(
      1 | hookFlags,
      { destroy: void 0 },
      create,
      void 0 === deps ? null : deps
    );
  }
  function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var inst = hook.memoizedState.inst;
    null !== currentHook && null !== deps && areHookInputsEqual(deps, currentHook.memoizedState.deps) ? hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps) : (currentlyRenderingFiber.flags |= fiberFlags, hook.memoizedState = pushSimpleEffect(
      1 | hookFlags,
      inst,
      create,
      deps
    ));
  }
  function mountEffect(create, deps) {
    mountEffectImpl(8390656, 8, create, deps);
  }
  function updateEffect(create, deps) {
    updateEffectImpl(2048, 8, create, deps);
  }
  function useEffectEventImpl(payload) {
    currentlyRenderingFiber.flags |= 4;
    var componentUpdateQueue = currentlyRenderingFiber.updateQueue;
    if (null === componentUpdateQueue)
      componentUpdateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = componentUpdateQueue, componentUpdateQueue.events = [payload];
    else {
      var events = componentUpdateQueue.events;
      null === events ? componentUpdateQueue.events = [payload] : events.push(payload);
    }
  }
  function updateEvent(callback) {
    var ref = updateWorkInProgressHook().memoizedState;
    useEffectEventImpl({ ref, nextImpl: callback });
    return function() {
      if (0 !== (executionContext & 2)) throw Error(formatProdErrorMessage(440));
      return ref.impl.apply(void 0, arguments);
    };
  }
  function updateInsertionEffect(create, deps) {
    return updateEffectImpl(4, 2, create, deps);
  }
  function updateLayoutEffect(create, deps) {
    return updateEffectImpl(4, 4, create, deps);
  }
  function imperativeHandleEffect(create, ref) {
    if ("function" === typeof ref) {
      create = create();
      var refCleanup = ref(create);
      return function() {
        "function" === typeof refCleanup ? refCleanup() : ref(null);
      };
    }
    if (null !== ref && void 0 !== ref)
      return create = create(), ref.current = create, function() {
        ref.current = null;
      };
  }
  function updateImperativeHandle(ref, create, deps) {
    deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
    updateEffectImpl(4, 4, imperativeHandleEffect.bind(null, create, ref), deps);
  }
  function mountDebugValue() {
  }
  function updateCallback(callback, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    hook.memoizedState = [callback, deps];
    return callback;
  }
  function updateMemo(nextCreate, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    prevState = nextCreate();
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(true);
      try {
        nextCreate();
      } finally {
        setIsStrictModeForDevtools(false);
      }
    }
    hook.memoizedState = [prevState, deps];
    return prevState;
  }
  function mountDeferredValueImpl(hook, value, initialValue) {
    if (void 0 === initialValue || 0 !== (renderLanes & 1073741824) && 0 === (workInProgressRootRenderLanes & 261930))
      return hook.memoizedState = value;
    hook.memoizedState = initialValue;
    hook = requestDeferredLane();
    currentlyRenderingFiber.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return initialValue;
  }
  function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
    if (objectIs(value, prevValue)) return value;
    if (null !== currentTreeHiddenStackCursor.current)
      return hook = mountDeferredValueImpl(hook, value, initialValue), objectIs(hook, prevValue) || (didReceiveUpdate = true), hook;
    if (0 === (renderLanes & 42) || 0 !== (renderLanes & 1073741824) && 0 === (workInProgressRootRenderLanes & 261930))
      return didReceiveUpdate = true, hook.memoizedState = value;
    hook = requestDeferredLane();
    currentlyRenderingFiber.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return prevValue;
  }
  function startTransition(fiber, queue, pendingState, finishedState, callback) {
    var previousPriority = ReactDOMSharedInternals.p;
    ReactDOMSharedInternals.p = 0 !== previousPriority && 8 > previousPriority ? previousPriority : 8;
    var prevTransition = ReactSharedInternals.T, currentTransition = {};
    ReactSharedInternals.T = currentTransition;
    dispatchOptimisticSetState(fiber, false, queue, pendingState);
    try {
      var returnValue = callback(), onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
      if (null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then) {
        var thenableForFinishedState = chainThenableValue(
          returnValue,
          finishedState
        );
        dispatchSetStateInternal(
          fiber,
          queue,
          thenableForFinishedState,
          requestUpdateLane(fiber)
        );
      } else
        dispatchSetStateInternal(
          fiber,
          queue,
          finishedState,
          requestUpdateLane(fiber)
        );
    } catch (error) {
      dispatchSetStateInternal(
        fiber,
        queue,
        { then: function() {
        }, status: "rejected", reason: error },
        requestUpdateLane()
      );
    } finally {
      ReactDOMSharedInternals.p = previousPriority, null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
    }
  }
  function noop() {
  }
  function startHostTransition(formFiber, pendingState, action, formData) {
    if (5 !== formFiber.tag) throw Error(formatProdErrorMessage(476));
    var queue = ensureFormComponentIsStateful(formFiber).queue;
    startTransition(
      formFiber,
      queue,
      pendingState,
      sharedNotPendingObject,
      null === action ? noop : function() {
        requestFormReset$1(formFiber);
        return action(formData);
      }
    );
  }
  function ensureFormComponentIsStateful(formFiber) {
    var existingStateHook = formFiber.memoizedState;
    if (null !== existingStateHook) return existingStateHook;
    existingStateHook = {
      memoizedState: sharedNotPendingObject,
      baseState: sharedNotPendingObject,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: sharedNotPendingObject
      },
      next: null
    };
    var initialResetState = {};
    existingStateHook.next = {
      memoizedState: initialResetState,
      baseState: initialResetState,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialResetState
      },
      next: null
    };
    formFiber.memoizedState = existingStateHook;
    formFiber = formFiber.alternate;
    null !== formFiber && (formFiber.memoizedState = existingStateHook);
    return existingStateHook;
  }
  function requestFormReset$1(formFiber) {
    var stateHook = ensureFormComponentIsStateful(formFiber);
    null === stateHook.next && (stateHook = formFiber.alternate.memoizedState);
    dispatchSetStateInternal(
      formFiber,
      stateHook.next.queue,
      {},
      requestUpdateLane()
    );
  }
  function useHostTransitionStatus() {
    return readContext(HostTransitionContext);
  }
  function updateId() {
    return updateWorkInProgressHook().memoizedState;
  }
  function updateRefresh() {
    return updateWorkInProgressHook().memoizedState;
  }
  function refreshCache(fiber) {
    for (var provider = fiber.return; null !== provider; ) {
      switch (provider.tag) {
        case 24:
        case 3:
          var lane = requestUpdateLane();
          fiber = createUpdate(lane);
          var root$69 = enqueueUpdate(provider, fiber, lane);
          null !== root$69 && (scheduleUpdateOnFiber(root$69, provider, lane), entangleTransitions(root$69, provider, lane));
          provider = { cache: createCache() };
          fiber.payload = provider;
          return;
      }
      provider = provider.return;
    }
  }
  function dispatchReducerAction(fiber, queue, action) {
    var lane = requestUpdateLane();
    action = {
      lane,
      revertLane: 0,
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    isRenderPhaseUpdate(fiber) ? enqueueRenderPhaseUpdate(queue, action) : (action = enqueueConcurrentHookUpdate(fiber, queue, action, lane), null !== action && (scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane)));
  }
  function dispatchSetState(fiber, queue, action) {
    var lane = requestUpdateLane();
    dispatchSetStateInternal(fiber, queue, action, lane);
  }
  function dispatchSetStateInternal(fiber, queue, action, lane) {
    var update = {
      lane,
      revertLane: 0,
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
    else {
      var alternate = fiber.alternate;
      if (0 === fiber.lanes && (null === alternate || 0 === alternate.lanes) && (alternate = queue.lastRenderedReducer, null !== alternate))
        try {
          var currentState = queue.lastRenderedState, eagerState = alternate(currentState, action);
          update.hasEagerState = true;
          update.eagerState = eagerState;
          if (objectIs(eagerState, currentState))
            return enqueueUpdate$1(fiber, queue, update, 0), null === workInProgressRoot && finishQueueingConcurrentUpdates(), false;
        } catch (error) {
        } finally {
        }
      action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
      if (null !== action)
        return scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane), true;
    }
    return false;
  }
  function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
    action = {
      lane: 2,
      revertLane: requestTransitionLane(),
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) {
      if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
    } else
      throwIfDuringRender = enqueueConcurrentHookUpdate(
        fiber,
        queue,
        action,
        2
      ), null !== throwIfDuringRender && scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
  }
  function isRenderPhaseUpdate(fiber) {
    var alternate = fiber.alternate;
    return fiber === currentlyRenderingFiber || null !== alternate && alternate === currentlyRenderingFiber;
  }
  function enqueueRenderPhaseUpdate(queue, update) {
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
    var pending = queue.pending;
    null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
    queue.pending = update;
  }
  function entangleTransitionUpdate(root2, queue, lane) {
    if (0 !== (lane & 4194048)) {
      var queueLanes = queue.lanes;
      queueLanes &= root2.pendingLanes;
      lane |= queueLanes;
      queue.lanes = lane;
      markRootEntangled(root2, lane);
    }
  }
  var ContextOnlyDispatcher = {
    readContext,
    use,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError,
    useHostTransitionStatus: throwInvalidHookError,
    useFormState: throwInvalidHookError,
    useActionState: throwInvalidHookError,
    useOptimistic: throwInvalidHookError,
    useMemoCache: throwInvalidHookError,
    useCacheRefresh: throwInvalidHookError
  };
  ContextOnlyDispatcher.useEffectEvent = throwInvalidHookError;
  var HooksDispatcherOnMount = {
    readContext,
    use,
    useCallback: function(callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        void 0 === deps ? null : deps
      ];
      return callback;
    },
    useContext: readContext,
    useEffect: mountEffect,
    useImperativeHandle: function(ref, create, deps) {
      deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
      mountEffectImpl(
        4194308,
        4,
        imperativeHandleEffect.bind(null, create, ref),
        deps
      );
    },
    useLayoutEffect: function(create, deps) {
      return mountEffectImpl(4194308, 4, create, deps);
    },
    useInsertionEffect: function(create, deps) {
      mountEffectImpl(4, 2, create, deps);
    },
    useMemo: function(nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      var nextValue = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    },
    useReducer: function(reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (void 0 !== init) {
        var initialState = init(initialArg);
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(true);
          try {
            init(initialArg);
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
      } else initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber,
        reducer
      );
      return [hook.memoizedState, reducer];
    },
    useRef: function(initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return hook.memoizedState = initialValue;
    },
    useState: function(initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue, dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    },
    useTransition: function() {
      var stateHook = mountStateImpl(false);
      stateHook = startTransition.bind(
        null,
        currentlyRenderingFiber,
        stateHook.queue,
        true,
        false
      );
      mountWorkInProgressHook().memoizedState = stateHook;
      return [false, stateHook];
    },
    useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber, hook = mountWorkInProgressHook();
      if (isHydrating) {
        if (void 0 === getServerSnapshot)
          throw Error(formatProdErrorMessage(407));
        getServerSnapshot = getServerSnapshot();
      } else {
        getServerSnapshot = getSnapshot();
        if (null === workInProgressRoot)
          throw Error(formatProdErrorMessage(349));
        0 !== (workInProgressRootRenderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
      }
      hook.memoizedState = getServerSnapshot;
      var inst = { value: getServerSnapshot, getSnapshot };
      hook.queue = inst;
      mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
        subscribe
      ]);
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(
          null,
          fiber,
          inst,
          getServerSnapshot,
          getSnapshot
        ),
        null
      );
      return getServerSnapshot;
    },
    useId: function() {
      var hook = mountWorkInProgressHook(), identifierPrefix = workInProgressRoot.identifierPrefix;
      if (isHydrating) {
        var JSCompiler_inline_result = treeContextOverflow;
        var idWithLeadingBit = treeContextId;
        JSCompiler_inline_result = (idWithLeadingBit & ~(1 << 32 - clz32(idWithLeadingBit) - 1)).toString(32) + JSCompiler_inline_result;
        identifierPrefix = "_" + identifierPrefix + "R_" + JSCompiler_inline_result;
        JSCompiler_inline_result = localIdCounter++;
        0 < JSCompiler_inline_result && (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
        identifierPrefix += "_";
      } else
        JSCompiler_inline_result = globalClientIdCounter++, identifierPrefix = "_" + identifierPrefix + "r_" + JSCompiler_inline_result.toString(32) + "_";
      return hook.memoizedState = identifierPrefix;
    },
    useHostTransitionStatus,
    useFormState: mountActionState,
    useActionState: mountActionState,
    useOptimistic: function(passthrough) {
      var hook = mountWorkInProgressHook();
      hook.memoizedState = hook.baseState = passthrough;
      var queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      hook.queue = queue;
      hook = dispatchOptimisticSetState.bind(
        null,
        currentlyRenderingFiber,
        true,
        queue
      );
      queue.dispatch = hook;
      return [passthrough, hook];
    },
    useMemoCache,
    useCacheRefresh: function() {
      return mountWorkInProgressHook().memoizedState = refreshCache.bind(
        null,
        currentlyRenderingFiber
      );
    },
    useEffectEvent: function(callback) {
      var hook = mountWorkInProgressHook(), ref = { impl: callback };
      hook.memoizedState = ref;
      return function() {
        if (0 !== (executionContext & 2))
          throw Error(formatProdErrorMessage(440));
        return ref.impl.apply(void 0, arguments);
      };
    }
  }, HooksDispatcherOnUpdate = {
    readContext,
    use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,
    useRef: updateRef,
    useState: function() {
      return updateReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function() {
      var booleanOrThenable = updateReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus,
    useFormState: updateActionState,
    useActionState: updateActionState,
    useOptimistic: function(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    },
    useMemoCache,
    useCacheRefresh: updateRefresh
  };
  HooksDispatcherOnUpdate.useEffectEvent = updateEvent;
  var HooksDispatcherOnRerender = {
    readContext,
    use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: rerenderReducer,
    useRef: updateRef,
    useState: function() {
      return rerenderReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return null === currentHook ? mountDeferredValueImpl(hook, value, initialValue) : updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function() {
      var booleanOrThenable = rerenderReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus,
    useFormState: rerenderActionState,
    useActionState: rerenderActionState,
    useOptimistic: function(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      if (null !== currentHook)
        return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
      hook.baseState = passthrough;
      return [passthrough, hook.queue.dispatch];
    },
    useMemoCache,
    useCacheRefresh: updateRefresh
  };
  HooksDispatcherOnRerender.useEffectEvent = updateEvent;
  function applyDerivedStateFromProps(workInProgress2, ctor, getDerivedStateFromProps, nextProps) {
    ctor = workInProgress2.memoizedState;
    getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
    getDerivedStateFromProps = null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps ? ctor : assign({}, ctor, getDerivedStateFromProps);
    workInProgress2.memoizedState = getDerivedStateFromProps;
    0 === workInProgress2.lanes && (workInProgress2.updateQueue.baseState = getDerivedStateFromProps);
  }
  var classComponentUpdater = {
    enqueueSetState: function(inst, payload, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.payload = payload;
      void 0 !== callback && null !== callback && (update.callback = callback);
      payload = enqueueUpdate(inst, update, lane);
      null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
    },
    enqueueReplaceState: function(inst, payload, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.tag = 1;
      update.payload = payload;
      void 0 !== callback && null !== callback && (update.callback = callback);
      payload = enqueueUpdate(inst, update, lane);
      null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
    },
    enqueueForceUpdate: function(inst, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.tag = 2;
      void 0 !== callback && null !== callback && (update.callback = callback);
      callback = enqueueUpdate(inst, update, lane);
      null !== callback && (scheduleUpdateOnFiber(callback, inst, lane), entangleTransitions(callback, inst, lane));
    }
  };
  function checkShouldComponentUpdate(workInProgress2, ctor, oldProps, newProps, oldState, newState, nextContext) {
    workInProgress2 = workInProgress2.stateNode;
    return "function" === typeof workInProgress2.shouldComponentUpdate ? workInProgress2.shouldComponentUpdate(newProps, newState, nextContext) : ctor.prototype && ctor.prototype.isPureReactComponent ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState) : true;
  }
  function callComponentWillReceiveProps(workInProgress2, instance, newProps, nextContext) {
    workInProgress2 = instance.state;
    "function" === typeof instance.componentWillReceiveProps && instance.componentWillReceiveProps(newProps, nextContext);
    "function" === typeof instance.UNSAFE_componentWillReceiveProps && instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
    instance.state !== workInProgress2 && classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
  }
  function resolveClassComponentProps(Component, baseProps) {
    var newProps = baseProps;
    if ("ref" in baseProps) {
      newProps = {};
      for (var propName in baseProps)
        "ref" !== propName && (newProps[propName] = baseProps[propName]);
    }
    if (Component = Component.defaultProps) {
      newProps === baseProps && (newProps = assign({}, newProps));
      for (var propName$73 in Component)
        void 0 === newProps[propName$73] && (newProps[propName$73] = Component[propName$73]);
    }
    return newProps;
  }
  function defaultOnUncaughtError(error) {
    reportGlobalError(error);
  }
  function defaultOnCaughtError(error) {
    console.error(error);
  }
  function defaultOnRecoverableError(error) {
    reportGlobalError(error);
  }
  function logUncaughtError(root2, errorInfo) {
    try {
      var onUncaughtError = root2.onUncaughtError;
      onUncaughtError(errorInfo.value, { componentStack: errorInfo.stack });
    } catch (e$74) {
      setTimeout(function() {
        throw e$74;
      });
    }
  }
  function logCaughtError(root2, boundary, errorInfo) {
    try {
      var onCaughtError = root2.onCaughtError;
      onCaughtError(errorInfo.value, {
        componentStack: errorInfo.stack,
        errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
      });
    } catch (e$75) {
      setTimeout(function() {
        throw e$75;
      });
    }
  }
  function createRootErrorUpdate(root2, errorInfo, lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    lane.payload = { element: null };
    lane.callback = function() {
      logUncaughtError(root2, errorInfo);
    };
    return lane;
  }
  function createClassErrorUpdate(lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    return lane;
  }
  function initializeClassErrorUpdate(update, root2, fiber, errorInfo) {
    var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
    if ("function" === typeof getDerivedStateFromError) {
      var error = errorInfo.value;
      update.payload = function() {
        return getDerivedStateFromError(error);
      };
      update.callback = function() {
        logCaughtError(root2, fiber, errorInfo);
      };
    }
    var inst = fiber.stateNode;
    null !== inst && "function" === typeof inst.componentDidCatch && (update.callback = function() {
      logCaughtError(root2, fiber, errorInfo);
      "function" !== typeof getDerivedStateFromError && (null === legacyErrorBoundariesThatAlreadyFailed ? legacyErrorBoundariesThatAlreadyFailed = /* @__PURE__ */ new Set([this]) : legacyErrorBoundariesThatAlreadyFailed.add(this));
      var stack = errorInfo.stack;
      this.componentDidCatch(errorInfo.value, {
        componentStack: null !== stack ? stack : ""
      });
    });
  }
  function throwException(root2, returnFiber, sourceFiber, value, rootRenderLanes) {
    sourceFiber.flags |= 32768;
    if (null !== value && "object" === typeof value && "function" === typeof value.then) {
      returnFiber = sourceFiber.alternate;
      null !== returnFiber && propagateParentContextChanges(
        returnFiber,
        sourceFiber,
        rootRenderLanes,
        true
      );
      sourceFiber = suspenseHandlerStackCursor.current;
      if (null !== sourceFiber) {
        switch (sourceFiber.tag) {
          case 31:
          case 13:
            return null === shellBoundary ? renderDidSuspendDelayIfPossible() : null === sourceFiber.alternate && 0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 3), sourceFiber.flags &= -257, sourceFiber.flags |= 65536, sourceFiber.lanes = rootRenderLanes, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? sourceFiber.updateQueue = /* @__PURE__ */ new Set([value]) : returnFiber.add(value), attachPingListener(root2, value, rootRenderLanes)), false;
          case 22:
            return sourceFiber.flags |= 65536, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? (returnFiber = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([value])
            }, sourceFiber.updateQueue = returnFiber) : (sourceFiber = returnFiber.retryQueue, null === sourceFiber ? returnFiber.retryQueue = /* @__PURE__ */ new Set([value]) : sourceFiber.add(value)), attachPingListener(root2, value, rootRenderLanes)), false;
        }
        throw Error(formatProdErrorMessage(435, sourceFiber.tag));
      }
      attachPingListener(root2, value, rootRenderLanes);
      renderDidSuspendDelayIfPossible();
      return false;
    }
    if (isHydrating)
      return returnFiber = suspenseHandlerStackCursor.current, null !== returnFiber ? (0 === (returnFiber.flags & 65536) && (returnFiber.flags |= 256), returnFiber.flags |= 65536, returnFiber.lanes = rootRenderLanes, value !== HydrationMismatchException && (root2 = Error(formatProdErrorMessage(422), { cause: value }), queueHydrationError(createCapturedValueAtFiber(root2, sourceFiber)))) : (value !== HydrationMismatchException && (returnFiber = Error(formatProdErrorMessage(423), {
        cause: value
      }), queueHydrationError(
        createCapturedValueAtFiber(returnFiber, sourceFiber)
      )), root2 = root2.current.alternate, root2.flags |= 65536, rootRenderLanes &= -rootRenderLanes, root2.lanes |= rootRenderLanes, value = createCapturedValueAtFiber(value, sourceFiber), rootRenderLanes = createRootErrorUpdate(
        root2.stateNode,
        value,
        rootRenderLanes
      ), enqueueCapturedUpdate(root2, rootRenderLanes), 4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2)), false;
    var wrapperError = Error(formatProdErrorMessage(520), { cause: value });
    wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
    null === workInProgressRootConcurrentErrors ? workInProgressRootConcurrentErrors = [wrapperError] : workInProgressRootConcurrentErrors.push(wrapperError);
    4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
    if (null === returnFiber) return true;
    value = createCapturedValueAtFiber(value, sourceFiber);
    sourceFiber = returnFiber;
    do {
      switch (sourceFiber.tag) {
        case 3:
          return sourceFiber.flags |= 65536, root2 = rootRenderLanes & -rootRenderLanes, sourceFiber.lanes |= root2, root2 = createRootErrorUpdate(sourceFiber.stateNode, value, root2), enqueueCapturedUpdate(sourceFiber, root2), false;
        case 1:
          if (returnFiber = sourceFiber.type, wrapperError = sourceFiber.stateNode, 0 === (sourceFiber.flags & 128) && ("function" === typeof returnFiber.getDerivedStateFromError || null !== wrapperError && "function" === typeof wrapperError.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(wrapperError))))
            return sourceFiber.flags |= 65536, rootRenderLanes &= -rootRenderLanes, sourceFiber.lanes |= rootRenderLanes, rootRenderLanes = createClassErrorUpdate(rootRenderLanes), initializeClassErrorUpdate(
              rootRenderLanes,
              root2,
              sourceFiber,
              value
            ), enqueueCapturedUpdate(sourceFiber, rootRenderLanes), false;
      }
      sourceFiber = sourceFiber.return;
    } while (null !== sourceFiber);
    return false;
  }
  var SelectiveHydrationException = Error(formatProdErrorMessage(461)), didReceiveUpdate = false;
  function reconcileChildren(current, workInProgress2, nextChildren, renderLanes2) {
    workInProgress2.child = null === current ? mountChildFibers(workInProgress2, null, nextChildren, renderLanes2) : reconcileChildFibers(
      workInProgress2,
      current.child,
      nextChildren,
      renderLanes2
    );
  }
  function updateForwardRef(current, workInProgress2, Component, nextProps, renderLanes2) {
    Component = Component.render;
    var ref = workInProgress2.ref;
    if ("ref" in nextProps) {
      var propsWithoutRef = {};
      for (var key in nextProps)
        "ref" !== key && (propsWithoutRef[key] = nextProps[key]);
    } else propsWithoutRef = nextProps;
    prepareToReadContext(workInProgress2);
    nextProps = renderWithHooks(
      current,
      workInProgress2,
      Component,
      propsWithoutRef,
      ref,
      renderLanes2
    );
    key = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && key && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    return workInProgress2.child;
  }
  function updateMemoComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    if (null === current) {
      var type = Component.type;
      if ("function" === typeof type && !shouldConstruct(type) && void 0 === type.defaultProps && null === Component.compare)
        return workInProgress2.tag = 15, workInProgress2.type = type, updateSimpleMemoComponent(
          current,
          workInProgress2,
          type,
          nextProps,
          renderLanes2
        );
      current = createFiberFromTypeAndProps(
        Component.type,
        null,
        nextProps,
        workInProgress2,
        workInProgress2.mode,
        renderLanes2
      );
      current.ref = workInProgress2.ref;
      current.return = workInProgress2;
      return workInProgress2.child = current;
    }
    type = current.child;
    if (!checkScheduledUpdateOrContext(current, renderLanes2)) {
      var prevProps = type.memoizedProps;
      Component = Component.compare;
      Component = null !== Component ? Component : shallowEqual;
      if (Component(prevProps, nextProps) && current.ref === workInProgress2.ref)
        return bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    }
    workInProgress2.flags |= 1;
    current = createWorkInProgress(type, nextProps);
    current.ref = workInProgress2.ref;
    current.return = workInProgress2;
    return workInProgress2.child = current;
  }
  function updateSimpleMemoComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    if (null !== current) {
      var prevProps = current.memoizedProps;
      if (shallowEqual(prevProps, nextProps) && current.ref === workInProgress2.ref)
        if (didReceiveUpdate = false, workInProgress2.pendingProps = nextProps = prevProps, checkScheduledUpdateOrContext(current, renderLanes2))
          0 !== (current.flags & 131072) && (didReceiveUpdate = true);
        else
          return workInProgress2.lanes = current.lanes, bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    }
    return updateFunctionComponent(
      current,
      workInProgress2,
      Component,
      nextProps,
      renderLanes2
    );
  }
  function updateOffscreenComponent(current, workInProgress2, renderLanes2, nextProps) {
    var nextChildren = nextProps.children, prevState = null !== current ? current.memoizedState : null;
    null === current && null === workInProgress2.stateNode && (workInProgress2.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
    if ("hidden" === nextProps.mode) {
      if (0 !== (workInProgress2.flags & 128)) {
        prevState = null !== prevState ? prevState.baseLanes | renderLanes2 : renderLanes2;
        if (null !== current) {
          nextProps = workInProgress2.child = current.child;
          for (nextChildren = 0; null !== nextProps; )
            nextChildren = nextChildren | nextProps.lanes | nextProps.childLanes, nextProps = nextProps.sibling;
          nextProps = nextChildren & ~prevState;
        } else nextProps = 0, workInProgress2.child = null;
        return deferHiddenOffscreenComponent(
          current,
          workInProgress2,
          prevState,
          renderLanes2,
          nextProps
        );
      }
      if (0 !== (renderLanes2 & 536870912))
        workInProgress2.memoizedState = { baseLanes: 0, cachePool: null }, null !== current && pushTransition(
          workInProgress2,
          null !== prevState ? prevState.cachePool : null
        ), null !== prevState ? pushHiddenContext(workInProgress2, prevState) : reuseHiddenContextOnStack(), pushOffscreenSuspenseHandler(workInProgress2);
      else
        return nextProps = workInProgress2.lanes = 536870912, deferHiddenOffscreenComponent(
          current,
          workInProgress2,
          null !== prevState ? prevState.baseLanes | renderLanes2 : renderLanes2,
          renderLanes2,
          nextProps
        );
    } else
      null !== prevState ? (pushTransition(workInProgress2, prevState.cachePool), pushHiddenContext(workInProgress2, prevState), reuseSuspenseHandlerOnStack(), workInProgress2.memoizedState = null) : (null !== current && pushTransition(workInProgress2, null), reuseHiddenContextOnStack(), reuseSuspenseHandlerOnStack());
    reconcileChildren(current, workInProgress2, nextChildren, renderLanes2);
    return workInProgress2.child;
  }
  function bailoutOffscreenComponent(current, workInProgress2) {
    null !== current && 22 === current.tag || null !== workInProgress2.stateNode || (workInProgress2.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
    return workInProgress2.sibling;
  }
  function deferHiddenOffscreenComponent(current, workInProgress2, nextBaseLanes, renderLanes2, remainingChildLanes) {
    var JSCompiler_inline_result = peekCacheFromPool();
    JSCompiler_inline_result = null === JSCompiler_inline_result ? null : { parent: CacheContext._currentValue, pool: JSCompiler_inline_result };
    workInProgress2.memoizedState = {
      baseLanes: nextBaseLanes,
      cachePool: JSCompiler_inline_result
    };
    null !== current && pushTransition(workInProgress2, null);
    reuseHiddenContextOnStack();
    pushOffscreenSuspenseHandler(workInProgress2);
    null !== current && propagateParentContextChanges(current, workInProgress2, renderLanes2, true);
    workInProgress2.childLanes = remainingChildLanes;
    return null;
  }
  function mountActivityChildren(workInProgress2, nextProps) {
    nextProps = mountWorkInProgressOffscreenFiber(
      { mode: nextProps.mode, children: nextProps.children },
      workInProgress2.mode
    );
    nextProps.ref = workInProgress2.ref;
    workInProgress2.child = nextProps;
    nextProps.return = workInProgress2;
    return nextProps;
  }
  function retryActivityComponentWithoutHydrating(current, workInProgress2, renderLanes2) {
    reconcileChildFibers(workInProgress2, current.child, null, renderLanes2);
    current = mountActivityChildren(workInProgress2, workInProgress2.pendingProps);
    current.flags |= 2;
    popSuspenseHandler(workInProgress2);
    workInProgress2.memoizedState = null;
    return current;
  }
  function updateActivityComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, didSuspend = 0 !== (workInProgress2.flags & 128);
    workInProgress2.flags &= -129;
    if (null === current) {
      if (isHydrating) {
        if ("hidden" === nextProps.mode)
          return current = mountActivityChildren(workInProgress2, nextProps), workInProgress2.lanes = 536870912, bailoutOffscreenComponent(null, current);
        pushDehydratedActivitySuspenseHandler(workInProgress2);
        (current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(
          current,
          rootOrSingletonContext
        ), current = null !== current && "&" === current.data ? current : null, null !== current && (workInProgress2.memoizedState = {
          dehydrated: current,
          treeContext: null !== treeContextProvider ? { id: treeContextId, overflow: treeContextOverflow } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, renderLanes2 = createFiberFromDehydratedFragment(current), renderLanes2.return = workInProgress2, workInProgress2.child = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null)) : current = null;
        if (null === current) throw throwOnHydrationMismatch(workInProgress2);
        workInProgress2.lanes = 536870912;
        return null;
      }
      return mountActivityChildren(workInProgress2, nextProps);
    }
    var prevState = current.memoizedState;
    if (null !== prevState) {
      var dehydrated = prevState.dehydrated;
      pushDehydratedActivitySuspenseHandler(workInProgress2);
      if (didSuspend)
        if (workInProgress2.flags & 256)
          workInProgress2.flags &= -257, workInProgress2 = retryActivityComponentWithoutHydrating(
            current,
            workInProgress2,
            renderLanes2
          );
        else if (null !== workInProgress2.memoizedState)
          workInProgress2.child = current.child, workInProgress2.flags |= 128, workInProgress2 = null;
        else throw Error(formatProdErrorMessage(558));
      else if (didReceiveUpdate || propagateParentContextChanges(current, workInProgress2, renderLanes2, false), didSuspend = 0 !== (renderLanes2 & current.childLanes), didReceiveUpdate || didSuspend) {
        nextProps = workInProgressRoot;
        if (null !== nextProps && (dehydrated = getBumpedLaneForHydration(nextProps, renderLanes2), 0 !== dehydrated && dehydrated !== prevState.retryLane))
          throw prevState.retryLane = dehydrated, enqueueConcurrentRenderForLane(current, dehydrated), scheduleUpdateOnFiber(nextProps, current, dehydrated), SelectiveHydrationException;
        renderDidSuspendDelayIfPossible();
        workInProgress2 = retryActivityComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      } else
        current = prevState.treeContext, nextHydratableInstance = getNextHydratable(dehydrated.nextSibling), hydrationParentFiber = workInProgress2, isHydrating = true, hydrationErrors = null, rootOrSingletonContext = false, null !== current && restoreSuspendedTreeContext(workInProgress2, current), workInProgress2 = mountActivityChildren(workInProgress2, nextProps), workInProgress2.flags |= 4096;
      return workInProgress2;
    }
    current = createWorkInProgress(current.child, {
      mode: nextProps.mode,
      children: nextProps.children
    });
    current.ref = workInProgress2.ref;
    workInProgress2.child = current;
    current.return = workInProgress2;
    return current;
  }
  function markRef(current, workInProgress2) {
    var ref = workInProgress2.ref;
    if (null === ref)
      null !== current && null !== current.ref && (workInProgress2.flags |= 4194816);
    else {
      if ("function" !== typeof ref && "object" !== typeof ref)
        throw Error(formatProdErrorMessage(284));
      if (null === current || current.ref !== ref)
        workInProgress2.flags |= 4194816;
    }
  }
  function updateFunctionComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    prepareToReadContext(workInProgress2);
    Component = renderWithHooks(
      current,
      workInProgress2,
      Component,
      nextProps,
      void 0,
      renderLanes2
    );
    nextProps = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && nextProps && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, Component, renderLanes2);
    return workInProgress2.child;
  }
  function replayFunctionComponent(current, workInProgress2, nextProps, Component, secondArg, renderLanes2) {
    prepareToReadContext(workInProgress2);
    workInProgress2.updateQueue = null;
    nextProps = renderWithHooksAgain(
      workInProgress2,
      Component,
      nextProps,
      secondArg
    );
    finishRenderingHooks(current);
    Component = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && Component && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    return workInProgress2.child;
  }
  function updateClassComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    prepareToReadContext(workInProgress2);
    if (null === workInProgress2.stateNode) {
      var context = emptyContextObject, contextType = Component.contextType;
      "object" === typeof contextType && null !== contextType && (context = readContext(contextType));
      context = new Component(nextProps, context);
      workInProgress2.memoizedState = null !== context.state && void 0 !== context.state ? context.state : null;
      context.updater = classComponentUpdater;
      workInProgress2.stateNode = context;
      context._reactInternals = workInProgress2;
      context = workInProgress2.stateNode;
      context.props = nextProps;
      context.state = workInProgress2.memoizedState;
      context.refs = {};
      initializeUpdateQueue(workInProgress2);
      contextType = Component.contextType;
      context.context = "object" === typeof contextType && null !== contextType ? readContext(contextType) : emptyContextObject;
      context.state = workInProgress2.memoizedState;
      contextType = Component.getDerivedStateFromProps;
      "function" === typeof contextType && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        contextType,
        nextProps
      ), context.state = workInProgress2.memoizedState);
      "function" === typeof Component.getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || (contextType = context.state, "function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount(), contextType !== context.state && classComponentUpdater.enqueueReplaceState(context, context.state, null), processUpdateQueue(workInProgress2, nextProps, context, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction(), context.state = workInProgress2.memoizedState);
      "function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308);
      nextProps = true;
    } else if (null === current) {
      context = workInProgress2.stateNode;
      var unresolvedOldProps = workInProgress2.memoizedProps, oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
      context.props = oldProps;
      var oldContext = context.context, contextType$jscomp$0 = Component.contextType;
      contextType = emptyContextObject;
      "object" === typeof contextType$jscomp$0 && null !== contextType$jscomp$0 && (contextType = readContext(contextType$jscomp$0));
      var getDerivedStateFromProps = Component.getDerivedStateFromProps;
      contextType$jscomp$0 = "function" === typeof getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate;
      unresolvedOldProps = workInProgress2.pendingProps !== unresolvedOldProps;
      contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (unresolvedOldProps || oldContext !== contextType) && callComponentWillReceiveProps(
        workInProgress2,
        context,
        nextProps,
        contextType
      );
      hasForceUpdate = false;
      var oldState = workInProgress2.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress2, nextProps, context, renderLanes2);
      suspendIfUpdateReadFromEntangledAsyncAction();
      oldContext = workInProgress2.memoizedState;
      unresolvedOldProps || oldState !== oldContext || hasForceUpdate ? ("function" === typeof getDerivedStateFromProps && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        getDerivedStateFromProps,
        nextProps
      ), oldContext = workInProgress2.memoizedState), (oldProps = hasForceUpdate || checkShouldComponentUpdate(
        workInProgress2,
        Component,
        oldProps,
        nextProps,
        oldState,
        oldContext,
        contextType
      )) ? (contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || ("function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount()), "function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308)) : ("function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = oldContext), context.props = nextProps, context.state = oldContext, context.context = contextType, nextProps = oldProps) : ("function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308), nextProps = false);
    } else {
      context = workInProgress2.stateNode;
      cloneUpdateQueue(current, workInProgress2);
      contextType = workInProgress2.memoizedProps;
      contextType$jscomp$0 = resolveClassComponentProps(Component, contextType);
      context.props = contextType$jscomp$0;
      getDerivedStateFromProps = workInProgress2.pendingProps;
      oldState = context.context;
      oldContext = Component.contextType;
      oldProps = emptyContextObject;
      "object" === typeof oldContext && null !== oldContext && (oldProps = readContext(oldContext));
      unresolvedOldProps = Component.getDerivedStateFromProps;
      (oldContext = "function" === typeof unresolvedOldProps || "function" === typeof context.getSnapshotBeforeUpdate) || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (contextType !== getDerivedStateFromProps || oldState !== oldProps) && callComponentWillReceiveProps(
        workInProgress2,
        context,
        nextProps,
        oldProps
      );
      hasForceUpdate = false;
      oldState = workInProgress2.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress2, nextProps, context, renderLanes2);
      suspendIfUpdateReadFromEntangledAsyncAction();
      var newState = workInProgress2.memoizedState;
      contextType !== getDerivedStateFromProps || oldState !== newState || hasForceUpdate || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies) ? ("function" === typeof unresolvedOldProps && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        unresolvedOldProps,
        nextProps
      ), newState = workInProgress2.memoizedState), (contextType$jscomp$0 = hasForceUpdate || checkShouldComponentUpdate(
        workInProgress2,
        Component,
        contextType$jscomp$0,
        nextProps,
        oldState,
        newState,
        oldProps
      ) || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies)) ? (oldContext || "function" !== typeof context.UNSAFE_componentWillUpdate && "function" !== typeof context.componentWillUpdate || ("function" === typeof context.componentWillUpdate && context.componentWillUpdate(nextProps, newState, oldProps), "function" === typeof context.UNSAFE_componentWillUpdate && context.UNSAFE_componentWillUpdate(
        nextProps,
        newState,
        oldProps
      )), "function" === typeof context.componentDidUpdate && (workInProgress2.flags |= 4), "function" === typeof context.getSnapshotBeforeUpdate && (workInProgress2.flags |= 1024)) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 1024), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = newState), context.props = nextProps, context.state = newState, context.context = oldProps, nextProps = contextType$jscomp$0) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 1024), nextProps = false);
    }
    context = nextProps;
    markRef(current, workInProgress2);
    nextProps = 0 !== (workInProgress2.flags & 128);
    context || nextProps ? (context = workInProgress2.stateNode, Component = nextProps && "function" !== typeof Component.getDerivedStateFromError ? null : context.render(), workInProgress2.flags |= 1, null !== current && nextProps ? (workInProgress2.child = reconcileChildFibers(
      workInProgress2,
      current.child,
      null,
      renderLanes2
    ), workInProgress2.child = reconcileChildFibers(
      workInProgress2,
      null,
      Component,
      renderLanes2
    )) : reconcileChildren(current, workInProgress2, Component, renderLanes2), workInProgress2.memoizedState = context.state, current = workInProgress2.child) : current = bailoutOnAlreadyFinishedWork(
      current,
      workInProgress2,
      renderLanes2
    );
    return current;
  }
  function mountHostRootWithoutHydrating(current, workInProgress2, nextChildren, renderLanes2) {
    resetHydrationState();
    workInProgress2.flags |= 256;
    reconcileChildren(current, workInProgress2, nextChildren, renderLanes2);
    return workInProgress2.child;
  }
  var SUSPENDED_MARKER = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function mountSuspenseOffscreenState(renderLanes2) {
    return { baseLanes: renderLanes2, cachePool: getSuspendedCache() };
  }
  function getRemainingWorkInPrimaryTree(current, primaryTreeDidDefer, renderLanes2) {
    current = null !== current ? current.childLanes & ~renderLanes2 : 0;
    primaryTreeDidDefer && (current |= workInProgressDeferredLane);
    return current;
  }
  function updateSuspenseComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, showFallback = false, didSuspend = 0 !== (workInProgress2.flags & 128), JSCompiler_temp;
    (JSCompiler_temp = didSuspend) || (JSCompiler_temp = null !== current && null === current.memoizedState ? false : 0 !== (suspenseStackCursor.current & 2));
    JSCompiler_temp && (showFallback = true, workInProgress2.flags &= -129);
    JSCompiler_temp = 0 !== (workInProgress2.flags & 32);
    workInProgress2.flags &= -33;
    if (null === current) {
      if (isHydrating) {
        showFallback ? pushPrimaryTreeSuspenseHandler(workInProgress2) : reuseSuspenseHandlerOnStack();
        (current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(
          current,
          rootOrSingletonContext
        ), current = null !== current && "&" !== current.data ? current : null, null !== current && (workInProgress2.memoizedState = {
          dehydrated: current,
          treeContext: null !== treeContextProvider ? { id: treeContextId, overflow: treeContextOverflow } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, renderLanes2 = createFiberFromDehydratedFragment(current), renderLanes2.return = workInProgress2, workInProgress2.child = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null)) : current = null;
        if (null === current) throw throwOnHydrationMismatch(workInProgress2);
        isSuspenseInstanceFallback(current) ? workInProgress2.lanes = 32 : workInProgress2.lanes = 536870912;
        return null;
      }
      var nextPrimaryChildren = nextProps.children;
      nextProps = nextProps.fallback;
      if (showFallback)
        return reuseSuspenseHandlerOnStack(), showFallback = workInProgress2.mode, nextPrimaryChildren = mountWorkInProgressOffscreenFiber(
          { mode: "hidden", children: nextPrimaryChildren },
          showFallback
        ), nextProps = createFiberFromFragment(
          nextProps,
          showFallback,
          renderLanes2,
          null
        ), nextPrimaryChildren.return = workInProgress2, nextProps.return = workInProgress2, nextPrimaryChildren.sibling = nextProps, workInProgress2.child = nextPrimaryChildren, nextProps = workInProgress2.child, nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes2), nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes2
        ), workInProgress2.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(null, nextProps);
      pushPrimaryTreeSuspenseHandler(workInProgress2);
      return mountSuspensePrimaryChildren(workInProgress2, nextPrimaryChildren);
    }
    var prevState = current.memoizedState;
    if (null !== prevState && (nextPrimaryChildren = prevState.dehydrated, null !== nextPrimaryChildren)) {
      if (didSuspend)
        workInProgress2.flags & 256 ? (pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags &= -257, workInProgress2 = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        )) : null !== workInProgress2.memoizedState ? (reuseSuspenseHandlerOnStack(), workInProgress2.child = current.child, workInProgress2.flags |= 128, workInProgress2 = null) : (reuseSuspenseHandlerOnStack(), nextPrimaryChildren = nextProps.fallback, showFallback = workInProgress2.mode, nextProps = mountWorkInProgressOffscreenFiber(
          { mode: "visible", children: nextProps.children },
          showFallback
        ), nextPrimaryChildren = createFiberFromFragment(
          nextPrimaryChildren,
          showFallback,
          renderLanes2,
          null
        ), nextPrimaryChildren.flags |= 2, nextProps.return = workInProgress2, nextPrimaryChildren.return = workInProgress2, nextProps.sibling = nextPrimaryChildren, workInProgress2.child = nextProps, reconcileChildFibers(
          workInProgress2,
          current.child,
          null,
          renderLanes2
        ), nextProps = workInProgress2.child, nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes2), nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes2
        ), workInProgress2.memoizedState = SUSPENDED_MARKER, workInProgress2 = bailoutOffscreenComponent(null, nextProps));
      else if (pushPrimaryTreeSuspenseHandler(workInProgress2), isSuspenseInstanceFallback(nextPrimaryChildren)) {
        JSCompiler_temp = nextPrimaryChildren.nextSibling && nextPrimaryChildren.nextSibling.dataset;
        if (JSCompiler_temp) var digest = JSCompiler_temp.dgst;
        JSCompiler_temp = digest;
        nextProps = Error(formatProdErrorMessage(419));
        nextProps.stack = "";
        nextProps.digest = JSCompiler_temp;
        queueHydrationError({ value: nextProps, source: null, stack: null });
        workInProgress2 = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      } else if (didReceiveUpdate || propagateParentContextChanges(current, workInProgress2, renderLanes2, false), JSCompiler_temp = 0 !== (renderLanes2 & current.childLanes), didReceiveUpdate || JSCompiler_temp) {
        JSCompiler_temp = workInProgressRoot;
        if (null !== JSCompiler_temp && (nextProps = getBumpedLaneForHydration(JSCompiler_temp, renderLanes2), 0 !== nextProps && nextProps !== prevState.retryLane))
          throw prevState.retryLane = nextProps, enqueueConcurrentRenderForLane(current, nextProps), scheduleUpdateOnFiber(JSCompiler_temp, current, nextProps), SelectiveHydrationException;
        isSuspenseInstancePending(nextPrimaryChildren) || renderDidSuspendDelayIfPossible();
        workInProgress2 = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      } else
        isSuspenseInstancePending(nextPrimaryChildren) ? (workInProgress2.flags |= 192, workInProgress2.child = current.child, workInProgress2 = null) : (current = prevState.treeContext, nextHydratableInstance = getNextHydratable(
          nextPrimaryChildren.nextSibling
        ), hydrationParentFiber = workInProgress2, isHydrating = true, hydrationErrors = null, rootOrSingletonContext = false, null !== current && restoreSuspendedTreeContext(workInProgress2, current), workInProgress2 = mountSuspensePrimaryChildren(
          workInProgress2,
          nextProps.children
        ), workInProgress2.flags |= 4096);
      return workInProgress2;
    }
    if (showFallback)
      return reuseSuspenseHandlerOnStack(), nextPrimaryChildren = nextProps.fallback, showFallback = workInProgress2.mode, prevState = current.child, digest = prevState.sibling, nextProps = createWorkInProgress(prevState, {
        mode: "hidden",
        children: nextProps.children
      }), nextProps.subtreeFlags = prevState.subtreeFlags & 65011712, null !== digest ? nextPrimaryChildren = createWorkInProgress(
        digest,
        nextPrimaryChildren
      ) : (nextPrimaryChildren = createFiberFromFragment(
        nextPrimaryChildren,
        showFallback,
        renderLanes2,
        null
      ), nextPrimaryChildren.flags |= 2), nextPrimaryChildren.return = workInProgress2, nextProps.return = workInProgress2, nextProps.sibling = nextPrimaryChildren, workInProgress2.child = nextProps, bailoutOffscreenComponent(null, nextProps), nextProps = workInProgress2.child, nextPrimaryChildren = current.child.memoizedState, null === nextPrimaryChildren ? nextPrimaryChildren = mountSuspenseOffscreenState(renderLanes2) : (showFallback = nextPrimaryChildren.cachePool, null !== showFallback ? (prevState = CacheContext._currentValue, showFallback = showFallback.parent !== prevState ? { parent: prevState, pool: prevState } : showFallback) : showFallback = getSuspendedCache(), nextPrimaryChildren = {
        baseLanes: nextPrimaryChildren.baseLanes | renderLanes2,
        cachePool: showFallback
      }), nextProps.memoizedState = nextPrimaryChildren, nextProps.childLanes = getRemainingWorkInPrimaryTree(
        current,
        JSCompiler_temp,
        renderLanes2
      ), workInProgress2.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(current.child, nextProps);
    pushPrimaryTreeSuspenseHandler(workInProgress2);
    renderLanes2 = current.child;
    current = renderLanes2.sibling;
    renderLanes2 = createWorkInProgress(renderLanes2, {
      mode: "visible",
      children: nextProps.children
    });
    renderLanes2.return = workInProgress2;
    renderLanes2.sibling = null;
    null !== current && (JSCompiler_temp = workInProgress2.deletions, null === JSCompiler_temp ? (workInProgress2.deletions = [current], workInProgress2.flags |= 16) : JSCompiler_temp.push(current));
    workInProgress2.child = renderLanes2;
    workInProgress2.memoizedState = null;
    return renderLanes2;
  }
  function mountSuspensePrimaryChildren(workInProgress2, primaryChildren) {
    primaryChildren = mountWorkInProgressOffscreenFiber(
      { mode: "visible", children: primaryChildren },
      workInProgress2.mode
    );
    primaryChildren.return = workInProgress2;
    return workInProgress2.child = primaryChildren;
  }
  function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
    offscreenProps = createFiberImplClass(22, offscreenProps, null, mode);
    offscreenProps.lanes = 0;
    return offscreenProps;
  }
  function retrySuspenseComponentWithoutHydrating(current, workInProgress2, renderLanes2) {
    reconcileChildFibers(workInProgress2, current.child, null, renderLanes2);
    current = mountSuspensePrimaryChildren(
      workInProgress2,
      workInProgress2.pendingProps.children
    );
    current.flags |= 2;
    workInProgress2.memoizedState = null;
    return current;
  }
  function scheduleSuspenseWorkOnFiber(fiber, renderLanes2, propagationRoot) {
    fiber.lanes |= renderLanes2;
    var alternate = fiber.alternate;
    null !== alternate && (alternate.lanes |= renderLanes2);
    scheduleContextWorkOnParentPath(fiber.return, renderLanes2, propagationRoot);
  }
  function initSuspenseListRenderState(workInProgress2, isBackwards, tail, lastContentRow, tailMode, treeForkCount2) {
    var renderState = workInProgress2.memoizedState;
    null === renderState ? workInProgress2.memoizedState = {
      isBackwards,
      rendering: null,
      renderingStartTime: 0,
      last: lastContentRow,
      tail,
      tailMode,
      treeForkCount: treeForkCount2
    } : (renderState.isBackwards = isBackwards, renderState.rendering = null, renderState.renderingStartTime = 0, renderState.last = lastContentRow, renderState.tail = tail, renderState.tailMode = tailMode, renderState.treeForkCount = treeForkCount2);
  }
  function updateSuspenseListComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, revealOrder = nextProps.revealOrder, tailMode = nextProps.tail;
    nextProps = nextProps.children;
    var suspenseContext = suspenseStackCursor.current, shouldForceFallback = 0 !== (suspenseContext & 2);
    shouldForceFallback ? (suspenseContext = suspenseContext & 1 | 2, workInProgress2.flags |= 128) : suspenseContext &= 1;
    push(suspenseStackCursor, suspenseContext);
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    nextProps = isHydrating ? treeForkCount : 0;
    if (!shouldForceFallback && null !== current && 0 !== (current.flags & 128))
      a: for (current = workInProgress2.child; null !== current; ) {
        if (13 === current.tag)
          null !== current.memoizedState && scheduleSuspenseWorkOnFiber(current, renderLanes2, workInProgress2);
        else if (19 === current.tag)
          scheduleSuspenseWorkOnFiber(current, renderLanes2, workInProgress2);
        else if (null !== current.child) {
          current.child.return = current;
          current = current.child;
          continue;
        }
        if (current === workInProgress2) break a;
        for (; null === current.sibling; ) {
          if (null === current.return || current.return === workInProgress2)
            break a;
          current = current.return;
        }
        current.sibling.return = current.return;
        current = current.sibling;
      }
    switch (revealOrder) {
      case "forwards":
        renderLanes2 = workInProgress2.child;
        for (revealOrder = null; null !== renderLanes2; )
          current = renderLanes2.alternate, null !== current && null === findFirstSuspended(current) && (revealOrder = renderLanes2), renderLanes2 = renderLanes2.sibling;
        renderLanes2 = revealOrder;
        null === renderLanes2 ? (revealOrder = workInProgress2.child, workInProgress2.child = null) : (revealOrder = renderLanes2.sibling, renderLanes2.sibling = null);
        initSuspenseListRenderState(
          workInProgress2,
          false,
          revealOrder,
          renderLanes2,
          tailMode,
          nextProps
        );
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        renderLanes2 = null;
        revealOrder = workInProgress2.child;
        for (workInProgress2.child = null; null !== revealOrder; ) {
          current = revealOrder.alternate;
          if (null !== current && null === findFirstSuspended(current)) {
            workInProgress2.child = revealOrder;
            break;
          }
          current = revealOrder.sibling;
          revealOrder.sibling = renderLanes2;
          renderLanes2 = revealOrder;
          revealOrder = current;
        }
        initSuspenseListRenderState(
          workInProgress2,
          true,
          renderLanes2,
          null,
          tailMode,
          nextProps
        );
        break;
      case "together":
        initSuspenseListRenderState(
          workInProgress2,
          false,
          null,
          null,
          void 0,
          nextProps
        );
        break;
      default:
        workInProgress2.memoizedState = null;
    }
    return workInProgress2.child;
  }
  function bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2) {
    null !== current && (workInProgress2.dependencies = current.dependencies);
    workInProgressRootSkippedLanes |= workInProgress2.lanes;
    if (0 === (renderLanes2 & workInProgress2.childLanes))
      if (null !== current) {
        if (propagateParentContextChanges(
          current,
          workInProgress2,
          renderLanes2,
          false
        ), 0 === (renderLanes2 & workInProgress2.childLanes))
          return null;
      } else return null;
    if (null !== current && workInProgress2.child !== current.child)
      throw Error(formatProdErrorMessage(153));
    if (null !== workInProgress2.child) {
      current = workInProgress2.child;
      renderLanes2 = createWorkInProgress(current, current.pendingProps);
      workInProgress2.child = renderLanes2;
      for (renderLanes2.return = workInProgress2; null !== current.sibling; )
        current = current.sibling, renderLanes2 = renderLanes2.sibling = createWorkInProgress(current, current.pendingProps), renderLanes2.return = workInProgress2;
      renderLanes2.sibling = null;
    }
    return workInProgress2.child;
  }
  function checkScheduledUpdateOrContext(current, renderLanes2) {
    if (0 !== (current.lanes & renderLanes2)) return true;
    current = current.dependencies;
    return null !== current && checkIfContextChanged(current) ? true : false;
  }
  function attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress2, renderLanes2) {
    switch (workInProgress2.tag) {
      case 3:
        pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
        pushProvider(workInProgress2, CacheContext, current.memoizedState.cache);
        resetHydrationState();
        break;
      case 27:
      case 5:
        pushHostContext(workInProgress2);
        break;
      case 4:
        pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
        break;
      case 10:
        pushProvider(
          workInProgress2,
          workInProgress2.type,
          workInProgress2.memoizedProps.value
        );
        break;
      case 31:
        if (null !== workInProgress2.memoizedState)
          return workInProgress2.flags |= 128, pushDehydratedActivitySuspenseHandler(workInProgress2), null;
        break;
      case 13:
        var state$102 = workInProgress2.memoizedState;
        if (null !== state$102) {
          if (null !== state$102.dehydrated)
            return pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags |= 128, null;
          if (0 !== (renderLanes2 & workInProgress2.child.childLanes))
            return updateSuspenseComponent(current, workInProgress2, renderLanes2);
          pushPrimaryTreeSuspenseHandler(workInProgress2);
          current = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress2,
            renderLanes2
          );
          return null !== current ? current.sibling : null;
        }
        pushPrimaryTreeSuspenseHandler(workInProgress2);
        break;
      case 19:
        var didSuspendBefore = 0 !== (current.flags & 128);
        state$102 = 0 !== (renderLanes2 & workInProgress2.childLanes);
        state$102 || (propagateParentContextChanges(
          current,
          workInProgress2,
          renderLanes2,
          false
        ), state$102 = 0 !== (renderLanes2 & workInProgress2.childLanes));
        if (didSuspendBefore) {
          if (state$102)
            return updateSuspenseListComponent(
              current,
              workInProgress2,
              renderLanes2
            );
          workInProgress2.flags |= 128;
        }
        didSuspendBefore = workInProgress2.memoizedState;
        null !== didSuspendBefore && (didSuspendBefore.rendering = null, didSuspendBefore.tail = null, didSuspendBefore.lastEffect = null);
        push(suspenseStackCursor, suspenseStackCursor.current);
        if (state$102) break;
        else return null;
      case 22:
        return workInProgress2.lanes = 0, updateOffscreenComponent(
          current,
          workInProgress2,
          renderLanes2,
          workInProgress2.pendingProps
        );
      case 24:
        pushProvider(workInProgress2, CacheContext, current.memoizedState.cache);
    }
    return bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
  }
  function beginWork(current, workInProgress2, renderLanes2) {
    if (null !== current)
      if (current.memoizedProps !== workInProgress2.pendingProps)
        didReceiveUpdate = true;
      else {
        if (!checkScheduledUpdateOrContext(current, renderLanes2) && 0 === (workInProgress2.flags & 128))
          return didReceiveUpdate = false, attemptEarlyBailoutIfNoScheduledUpdate(
            current,
            workInProgress2,
            renderLanes2
          );
        didReceiveUpdate = 0 !== (current.flags & 131072) ? true : false;
      }
    else
      didReceiveUpdate = false, isHydrating && 0 !== (workInProgress2.flags & 1048576) && pushTreeId(workInProgress2, treeForkCount, workInProgress2.index);
    workInProgress2.lanes = 0;
    switch (workInProgress2.tag) {
      case 16:
        a: {
          var props = workInProgress2.pendingProps;
          current = resolveLazy(workInProgress2.elementType);
          workInProgress2.type = current;
          if ("function" === typeof current)
            shouldConstruct(current) ? (props = resolveClassComponentProps(current, props), workInProgress2.tag = 1, workInProgress2 = updateClassComponent(
              null,
              workInProgress2,
              current,
              props,
              renderLanes2
            )) : (workInProgress2.tag = 0, workInProgress2 = updateFunctionComponent(
              null,
              workInProgress2,
              current,
              props,
              renderLanes2
            ));
          else {
            if (void 0 !== current && null !== current) {
              var $$typeof = current.$$typeof;
              if ($$typeof === REACT_FORWARD_REF_TYPE) {
                workInProgress2.tag = 11;
                workInProgress2 = updateForwardRef(
                  null,
                  workInProgress2,
                  current,
                  props,
                  renderLanes2
                );
                break a;
              } else if ($$typeof === REACT_MEMO_TYPE) {
                workInProgress2.tag = 14;
                workInProgress2 = updateMemoComponent(
                  null,
                  workInProgress2,
                  current,
                  props,
                  renderLanes2
                );
                break a;
              }
            }
            workInProgress2 = getComponentNameFromType(current) || current;
            throw Error(formatProdErrorMessage(306, workInProgress2, ""));
          }
        }
        return workInProgress2;
      case 0:
        return updateFunctionComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 1:
        return props = workInProgress2.type, $$typeof = resolveClassComponentProps(
          props,
          workInProgress2.pendingProps
        ), updateClassComponent(
          current,
          workInProgress2,
          props,
          $$typeof,
          renderLanes2
        );
      case 3:
        a: {
          pushHostContainer(
            workInProgress2,
            workInProgress2.stateNode.containerInfo
          );
          if (null === current) throw Error(formatProdErrorMessage(387));
          props = workInProgress2.pendingProps;
          var prevState = workInProgress2.memoizedState;
          $$typeof = prevState.element;
          cloneUpdateQueue(current, workInProgress2);
          processUpdateQueue(workInProgress2, props, null, renderLanes2);
          var nextState = workInProgress2.memoizedState;
          props = nextState.cache;
          pushProvider(workInProgress2, CacheContext, props);
          props !== prevState.cache && propagateContextChanges(
            workInProgress2,
            [CacheContext],
            renderLanes2,
            true
          );
          suspendIfUpdateReadFromEntangledAsyncAction();
          props = nextState.element;
          if (prevState.isDehydrated)
            if (prevState = {
              element: props,
              isDehydrated: false,
              cache: nextState.cache
            }, workInProgress2.updateQueue.baseState = prevState, workInProgress2.memoizedState = prevState, workInProgress2.flags & 256) {
              workInProgress2 = mountHostRootWithoutHydrating(
                current,
                workInProgress2,
                props,
                renderLanes2
              );
              break a;
            } else if (props !== $$typeof) {
              $$typeof = createCapturedValueAtFiber(
                Error(formatProdErrorMessage(424)),
                workInProgress2
              );
              queueHydrationError($$typeof);
              workInProgress2 = mountHostRootWithoutHydrating(
                current,
                workInProgress2,
                props,
                renderLanes2
              );
              break a;
            } else {
              current = workInProgress2.stateNode.containerInfo;
              switch (current.nodeType) {
                case 9:
                  current = current.body;
                  break;
                default:
                  current = "HTML" === current.nodeName ? current.ownerDocument.body : current;
              }
              nextHydratableInstance = getNextHydratable(current.firstChild);
              hydrationParentFiber = workInProgress2;
              isHydrating = true;
              hydrationErrors = null;
              rootOrSingletonContext = true;
              renderLanes2 = mountChildFibers(
                workInProgress2,
                null,
                props,
                renderLanes2
              );
              for (workInProgress2.child = renderLanes2; renderLanes2; )
                renderLanes2.flags = renderLanes2.flags & -3 | 4096, renderLanes2 = renderLanes2.sibling;
            }
          else {
            resetHydrationState();
            if (props === $$typeof) {
              workInProgress2 = bailoutOnAlreadyFinishedWork(
                current,
                workInProgress2,
                renderLanes2
              );
              break a;
            }
            reconcileChildren(current, workInProgress2, props, renderLanes2);
          }
          workInProgress2 = workInProgress2.child;
        }
        return workInProgress2;
      case 26:
        return markRef(current, workInProgress2), null === current ? (renderLanes2 = getResource(
          workInProgress2.type,
          null,
          workInProgress2.pendingProps,
          null
        )) ? workInProgress2.memoizedState = renderLanes2 : isHydrating || (renderLanes2 = workInProgress2.type, current = workInProgress2.pendingProps, props = getOwnerDocumentFromRootContainer(
          rootInstanceStackCursor.current
        ).createElement(renderLanes2), props[internalInstanceKey] = workInProgress2, props[internalPropsKey] = current, setInitialProperties(props, renderLanes2, current), markNodeAsHoistable(props), workInProgress2.stateNode = props) : workInProgress2.memoizedState = getResource(
          workInProgress2.type,
          current.memoizedProps,
          workInProgress2.pendingProps,
          current.memoizedState
        ), null;
      case 27:
        return pushHostContext(workInProgress2), null === current && isHydrating && (props = workInProgress2.stateNode = resolveSingletonInstance(
          workInProgress2.type,
          workInProgress2.pendingProps,
          rootInstanceStackCursor.current
        ), hydrationParentFiber = workInProgress2, rootOrSingletonContext = true, $$typeof = nextHydratableInstance, isSingletonScope(workInProgress2.type) ? (previousHydratableOnEnteringScopedSingleton = $$typeof, nextHydratableInstance = getNextHydratable(props.firstChild)) : nextHydratableInstance = $$typeof), reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), markRef(current, workInProgress2), null === current && (workInProgress2.flags |= 4194304), workInProgress2.child;
      case 5:
        if (null === current && isHydrating) {
          if ($$typeof = props = nextHydratableInstance)
            props = canHydrateInstance(
              props,
              workInProgress2.type,
              workInProgress2.pendingProps,
              rootOrSingletonContext
            ), null !== props ? (workInProgress2.stateNode = props, hydrationParentFiber = workInProgress2, nextHydratableInstance = getNextHydratable(props.firstChild), rootOrSingletonContext = false, $$typeof = true) : $$typeof = false;
          $$typeof || throwOnHydrationMismatch(workInProgress2);
        }
        pushHostContext(workInProgress2);
        $$typeof = workInProgress2.type;
        prevState = workInProgress2.pendingProps;
        nextState = null !== current ? current.memoizedProps : null;
        props = prevState.children;
        shouldSetTextContent($$typeof, prevState) ? props = null : null !== nextState && shouldSetTextContent($$typeof, nextState) && (workInProgress2.flags |= 32);
        null !== workInProgress2.memoizedState && ($$typeof = renderWithHooks(
          current,
          workInProgress2,
          TransitionAwareHostComponent,
          null,
          null,
          renderLanes2
        ), HostTransitionContext._currentValue = $$typeof);
        markRef(current, workInProgress2);
        reconcileChildren(current, workInProgress2, props, renderLanes2);
        return workInProgress2.child;
      case 6:
        if (null === current && isHydrating) {
          if (current = renderLanes2 = nextHydratableInstance)
            renderLanes2 = canHydrateTextInstance(
              renderLanes2,
              workInProgress2.pendingProps,
              rootOrSingletonContext
            ), null !== renderLanes2 ? (workInProgress2.stateNode = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null, current = true) : current = false;
          current || throwOnHydrationMismatch(workInProgress2);
        }
        return null;
      case 13:
        return updateSuspenseComponent(current, workInProgress2, renderLanes2);
      case 4:
        return pushHostContainer(
          workInProgress2,
          workInProgress2.stateNode.containerInfo
        ), props = workInProgress2.pendingProps, null === current ? workInProgress2.child = reconcileChildFibers(
          workInProgress2,
          null,
          props,
          renderLanes2
        ) : reconcileChildren(current, workInProgress2, props, renderLanes2), workInProgress2.child;
      case 11:
        return updateForwardRef(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 7:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps,
          renderLanes2
        ), workInProgress2.child;
      case 8:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 12:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 10:
        return props = workInProgress2.pendingProps, pushProvider(workInProgress2, workInProgress2.type, props.value), reconcileChildren(current, workInProgress2, props.children, renderLanes2), workInProgress2.child;
      case 9:
        return $$typeof = workInProgress2.type._context, props = workInProgress2.pendingProps.children, prepareToReadContext(workInProgress2), $$typeof = readContext($$typeof), props = props($$typeof), workInProgress2.flags |= 1, reconcileChildren(current, workInProgress2, props, renderLanes2), workInProgress2.child;
      case 14:
        return updateMemoComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 15:
        return updateSimpleMemoComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 19:
        return updateSuspenseListComponent(current, workInProgress2, renderLanes2);
      case 31:
        return updateActivityComponent(current, workInProgress2, renderLanes2);
      case 22:
        return updateOffscreenComponent(
          current,
          workInProgress2,
          renderLanes2,
          workInProgress2.pendingProps
        );
      case 24:
        return prepareToReadContext(workInProgress2), props = readContext(CacheContext), null === current ? ($$typeof = peekCacheFromPool(), null === $$typeof && ($$typeof = workInProgressRoot, prevState = createCache(), $$typeof.pooledCache = prevState, prevState.refCount++, null !== prevState && ($$typeof.pooledCacheLanes |= renderLanes2), $$typeof = prevState), workInProgress2.memoizedState = { parent: props, cache: $$typeof }, initializeUpdateQueue(workInProgress2), pushProvider(workInProgress2, CacheContext, $$typeof)) : (0 !== (current.lanes & renderLanes2) && (cloneUpdateQueue(current, workInProgress2), processUpdateQueue(workInProgress2, null, null, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction()), $$typeof = current.memoizedState, prevState = workInProgress2.memoizedState, $$typeof.parent !== props ? ($$typeof = { parent: props, cache: props }, workInProgress2.memoizedState = $$typeof, 0 === workInProgress2.lanes && (workInProgress2.memoizedState = workInProgress2.updateQueue.baseState = $$typeof), pushProvider(workInProgress2, CacheContext, props)) : (props = prevState.cache, pushProvider(workInProgress2, CacheContext, props), props !== $$typeof.cache && propagateContextChanges(
          workInProgress2,
          [CacheContext],
          renderLanes2,
          true
        ))), reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 29:
        throw workInProgress2.pendingProps;
    }
    throw Error(formatProdErrorMessage(156, workInProgress2.tag));
  }
  function markUpdate(workInProgress2) {
    workInProgress2.flags |= 4;
  }
  function preloadInstanceAndSuspendIfNeeded(workInProgress2, type, oldProps, newProps, renderLanes2) {
    if (type = 0 !== (workInProgress2.mode & 32)) type = false;
    if (type) {
      if (workInProgress2.flags |= 16777216, (renderLanes2 & 335544128) === renderLanes2)
        if (workInProgress2.stateNode.complete) workInProgress2.flags |= 8192;
        else if (shouldRemainOnPreviousScreen()) workInProgress2.flags |= 8192;
        else
          throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
    } else workInProgress2.flags &= -16777217;
  }
  function preloadResourceAndSuspendIfNeeded(workInProgress2, resource) {
    if ("stylesheet" !== resource.type || 0 !== (resource.state.loading & 4))
      workInProgress2.flags &= -16777217;
    else if (workInProgress2.flags |= 16777216, !preloadResource(resource))
      if (shouldRemainOnPreviousScreen()) workInProgress2.flags |= 8192;
      else
        throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
  }
  function scheduleRetryEffect(workInProgress2, retryQueue) {
    null !== retryQueue && (workInProgress2.flags |= 4);
    workInProgress2.flags & 16384 && (retryQueue = 22 !== workInProgress2.tag ? claimNextRetryLane() : 536870912, workInProgress2.lanes |= retryQueue, workInProgressSuspendedRetryLanes |= retryQueue);
  }
  function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
    if (!isHydrating)
      switch (renderState.tailMode) {
        case "hidden":
          hasRenderedATailFallback = renderState.tail;
          for (var lastTailNode = null; null !== hasRenderedATailFallback; )
            null !== hasRenderedATailFallback.alternate && (lastTailNode = hasRenderedATailFallback), hasRenderedATailFallback = hasRenderedATailFallback.sibling;
          null === lastTailNode ? renderState.tail = null : lastTailNode.sibling = null;
          break;
        case "collapsed":
          lastTailNode = renderState.tail;
          for (var lastTailNode$106 = null; null !== lastTailNode; )
            null !== lastTailNode.alternate && (lastTailNode$106 = lastTailNode), lastTailNode = lastTailNode.sibling;
          null === lastTailNode$106 ? hasRenderedATailFallback || null === renderState.tail ? renderState.tail = null : renderState.tail.sibling = null : lastTailNode$106.sibling = null;
      }
  }
  function bubbleProperties(completedWork) {
    var didBailout = null !== completedWork.alternate && completedWork.alternate.child === completedWork.child, newChildLanes = 0, subtreeFlags = 0;
    if (didBailout)
      for (var child$107 = completedWork.child; null !== child$107; )
        newChildLanes |= child$107.lanes | child$107.childLanes, subtreeFlags |= child$107.subtreeFlags & 65011712, subtreeFlags |= child$107.flags & 65011712, child$107.return = completedWork, child$107 = child$107.sibling;
    else
      for (child$107 = completedWork.child; null !== child$107; )
        newChildLanes |= child$107.lanes | child$107.childLanes, subtreeFlags |= child$107.subtreeFlags, subtreeFlags |= child$107.flags, child$107.return = completedWork, child$107 = child$107.sibling;
    completedWork.subtreeFlags |= subtreeFlags;
    completedWork.childLanes = newChildLanes;
    return didBailout;
  }
  function completeWork(current, workInProgress2, renderLanes2) {
    var newProps = workInProgress2.pendingProps;
    popTreeContext(workInProgress2);
    switch (workInProgress2.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return bubbleProperties(workInProgress2), null;
      case 1:
        return bubbleProperties(workInProgress2), null;
      case 3:
        renderLanes2 = workInProgress2.stateNode;
        newProps = null;
        null !== current && (newProps = current.memoizedState.cache);
        workInProgress2.memoizedState.cache !== newProps && (workInProgress2.flags |= 2048);
        popProvider(CacheContext);
        popHostContainer();
        renderLanes2.pendingContext && (renderLanes2.context = renderLanes2.pendingContext, renderLanes2.pendingContext = null);
        if (null === current || null === current.child)
          popHydrationState(workInProgress2) ? markUpdate(workInProgress2) : null === current || current.memoizedState.isDehydrated && 0 === (workInProgress2.flags & 256) || (workInProgress2.flags |= 1024, upgradeHydrationErrorsToRecoverable());
        bubbleProperties(workInProgress2);
        return null;
      case 26:
        var type = workInProgress2.type, nextResource = workInProgress2.memoizedState;
        null === current ? (markUpdate(workInProgress2), null !== nextResource ? (bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          type,
          null,
          newProps,
          renderLanes2
        ))) : nextResource ? nextResource !== current.memoizedState ? (markUpdate(workInProgress2), bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), workInProgress2.flags &= -16777217) : (current = current.memoizedProps, current !== newProps && markUpdate(workInProgress2), bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          type,
          current,
          newProps,
          renderLanes2
        ));
        return null;
      case 27:
        popHostContext(workInProgress2);
        renderLanes2 = rootInstanceStackCursor.current;
        type = workInProgress2.type;
        if (null !== current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if (!newProps) {
            if (null === workInProgress2.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress2);
            return null;
          }
          current = contextStackCursor.current;
          popHydrationState(workInProgress2) ? prepareToHydrateHostInstance(workInProgress2) : (current = resolveSingletonInstance(type, newProps, renderLanes2), workInProgress2.stateNode = current, markUpdate(workInProgress2));
        }
        bubbleProperties(workInProgress2);
        return null;
      case 5:
        popHostContext(workInProgress2);
        type = workInProgress2.type;
        if (null !== current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if (!newProps) {
            if (null === workInProgress2.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress2);
            return null;
          }
          nextResource = contextStackCursor.current;
          if (popHydrationState(workInProgress2))
            prepareToHydrateHostInstance(workInProgress2);
          else {
            var ownerDocument = getOwnerDocumentFromRootContainer(
              rootInstanceStackCursor.current
            );
            switch (nextResource) {
              case 1:
                nextResource = ownerDocument.createElementNS(
                  "http://www.w3.org/2000/svg",
                  type
                );
                break;
              case 2:
                nextResource = ownerDocument.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  type
                );
                break;
              default:
                switch (type) {
                  case "svg":
                    nextResource = ownerDocument.createElementNS(
                      "http://www.w3.org/2000/svg",
                      type
                    );
                    break;
                  case "math":
                    nextResource = ownerDocument.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      type
                    );
                    break;
                  case "script":
                    nextResource = ownerDocument.createElement("div");
                    nextResource.innerHTML = "<script><\/script>";
                    nextResource = nextResource.removeChild(
                      nextResource.firstChild
                    );
                    break;
                  case "select":
                    nextResource = "string" === typeof newProps.is ? ownerDocument.createElement("select", {
                      is: newProps.is
                    }) : ownerDocument.createElement("select");
                    newProps.multiple ? nextResource.multiple = true : newProps.size && (nextResource.size = newProps.size);
                    break;
                  default:
                    nextResource = "string" === typeof newProps.is ? ownerDocument.createElement(type, { is: newProps.is }) : ownerDocument.createElement(type);
                }
            }
            nextResource[internalInstanceKey] = workInProgress2;
            nextResource[internalPropsKey] = newProps;
            a: for (ownerDocument = workInProgress2.child; null !== ownerDocument; ) {
              if (5 === ownerDocument.tag || 6 === ownerDocument.tag)
                nextResource.appendChild(ownerDocument.stateNode);
              else if (4 !== ownerDocument.tag && 27 !== ownerDocument.tag && null !== ownerDocument.child) {
                ownerDocument.child.return = ownerDocument;
                ownerDocument = ownerDocument.child;
                continue;
              }
              if (ownerDocument === workInProgress2) break a;
              for (; null === ownerDocument.sibling; ) {
                if (null === ownerDocument.return || ownerDocument.return === workInProgress2)
                  break a;
                ownerDocument = ownerDocument.return;
              }
              ownerDocument.sibling.return = ownerDocument.return;
              ownerDocument = ownerDocument.sibling;
            }
            workInProgress2.stateNode = nextResource;
            a: switch (setInitialProperties(nextResource, type, newProps), type) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                newProps = !!newProps.autoFocus;
                break a;
              case "img":
                newProps = true;
                break a;
              default:
                newProps = false;
            }
            newProps && markUpdate(workInProgress2);
          }
        }
        bubbleProperties(workInProgress2);
        preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          workInProgress2.type,
          null === current ? null : current.memoizedProps,
          workInProgress2.pendingProps,
          renderLanes2
        );
        return null;
      case 6:
        if (current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if ("string" !== typeof newProps && null === workInProgress2.stateNode)
            throw Error(formatProdErrorMessage(166));
          current = rootInstanceStackCursor.current;
          if (popHydrationState(workInProgress2)) {
            current = workInProgress2.stateNode;
            renderLanes2 = workInProgress2.memoizedProps;
            newProps = null;
            type = hydrationParentFiber;
            if (null !== type)
              switch (type.tag) {
                case 27:
                case 5:
                  newProps = type.memoizedProps;
              }
            current[internalInstanceKey] = workInProgress2;
            current = current.nodeValue === renderLanes2 || null !== newProps && true === newProps.suppressHydrationWarning || checkForUnmatchedText(current.nodeValue, renderLanes2) ? true : false;
            current || throwOnHydrationMismatch(workInProgress2, true);
          } else
            current = getOwnerDocumentFromRootContainer(current).createTextNode(
              newProps
            ), current[internalInstanceKey] = workInProgress2, workInProgress2.stateNode = current;
        }
        bubbleProperties(workInProgress2);
        return null;
      case 31:
        renderLanes2 = workInProgress2.memoizedState;
        if (null === current || null !== current.memoizedState) {
          newProps = popHydrationState(workInProgress2);
          if (null !== renderLanes2) {
            if (null === current) {
              if (!newProps) throw Error(formatProdErrorMessage(318));
              current = workInProgress2.memoizedState;
              current = null !== current ? current.dehydrated : null;
              if (!current) throw Error(formatProdErrorMessage(557));
              current[internalInstanceKey] = workInProgress2;
            } else
              resetHydrationState(), 0 === (workInProgress2.flags & 128) && (workInProgress2.memoizedState = null), workInProgress2.flags |= 4;
            bubbleProperties(workInProgress2);
            current = false;
          } else
            renderLanes2 = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = renderLanes2), current = true;
          if (!current) {
            if (workInProgress2.flags & 256)
              return popSuspenseHandler(workInProgress2), workInProgress2;
            popSuspenseHandler(workInProgress2);
            return null;
          }
          if (0 !== (workInProgress2.flags & 128))
            throw Error(formatProdErrorMessage(558));
        }
        bubbleProperties(workInProgress2);
        return null;
      case 13:
        newProps = workInProgress2.memoizedState;
        if (null === current || null !== current.memoizedState && null !== current.memoizedState.dehydrated) {
          type = popHydrationState(workInProgress2);
          if (null !== newProps && null !== newProps.dehydrated) {
            if (null === current) {
              if (!type) throw Error(formatProdErrorMessage(318));
              type = workInProgress2.memoizedState;
              type = null !== type ? type.dehydrated : null;
              if (!type) throw Error(formatProdErrorMessage(317));
              type[internalInstanceKey] = workInProgress2;
            } else
              resetHydrationState(), 0 === (workInProgress2.flags & 128) && (workInProgress2.memoizedState = null), workInProgress2.flags |= 4;
            bubbleProperties(workInProgress2);
            type = false;
          } else
            type = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = type), type = true;
          if (!type) {
            if (workInProgress2.flags & 256)
              return popSuspenseHandler(workInProgress2), workInProgress2;
            popSuspenseHandler(workInProgress2);
            return null;
          }
        }
        popSuspenseHandler(workInProgress2);
        if (0 !== (workInProgress2.flags & 128))
          return workInProgress2.lanes = renderLanes2, workInProgress2;
        renderLanes2 = null !== newProps;
        current = null !== current && null !== current.memoizedState;
        renderLanes2 && (newProps = workInProgress2.child, type = null, null !== newProps.alternate && null !== newProps.alternate.memoizedState && null !== newProps.alternate.memoizedState.cachePool && (type = newProps.alternate.memoizedState.cachePool.pool), nextResource = null, null !== newProps.memoizedState && null !== newProps.memoizedState.cachePool && (nextResource = newProps.memoizedState.cachePool.pool), nextResource !== type && (newProps.flags |= 2048));
        renderLanes2 !== current && renderLanes2 && (workInProgress2.child.flags |= 8192);
        scheduleRetryEffect(workInProgress2, workInProgress2.updateQueue);
        bubbleProperties(workInProgress2);
        return null;
      case 4:
        return popHostContainer(), null === current && listenToAllSupportedEvents(workInProgress2.stateNode.containerInfo), bubbleProperties(workInProgress2), null;
      case 10:
        return popProvider(workInProgress2.type), bubbleProperties(workInProgress2), null;
      case 19:
        pop(suspenseStackCursor);
        newProps = workInProgress2.memoizedState;
        if (null === newProps) return bubbleProperties(workInProgress2), null;
        type = 0 !== (workInProgress2.flags & 128);
        nextResource = newProps.rendering;
        if (null === nextResource)
          if (type) cutOffTailIfNeeded(newProps, false);
          else {
            if (0 !== workInProgressRootExitStatus || null !== current && 0 !== (current.flags & 128))
              for (current = workInProgress2.child; null !== current; ) {
                nextResource = findFirstSuspended(current);
                if (null !== nextResource) {
                  workInProgress2.flags |= 128;
                  cutOffTailIfNeeded(newProps, false);
                  current = nextResource.updateQueue;
                  workInProgress2.updateQueue = current;
                  scheduleRetryEffect(workInProgress2, current);
                  workInProgress2.subtreeFlags = 0;
                  current = renderLanes2;
                  for (renderLanes2 = workInProgress2.child; null !== renderLanes2; )
                    resetWorkInProgress(renderLanes2, current), renderLanes2 = renderLanes2.sibling;
                  push(
                    suspenseStackCursor,
                    suspenseStackCursor.current & 1 | 2
                  );
                  isHydrating && pushTreeFork(workInProgress2, newProps.treeForkCount);
                  return workInProgress2.child;
                }
                current = current.sibling;
              }
            null !== newProps.tail && now() > workInProgressRootRenderTargetTime && (workInProgress2.flags |= 128, type = true, cutOffTailIfNeeded(newProps, false), workInProgress2.lanes = 4194304);
          }
        else {
          if (!type)
            if (current = findFirstSuspended(nextResource), null !== current) {
              if (workInProgress2.flags |= 128, type = true, current = current.updateQueue, workInProgress2.updateQueue = current, scheduleRetryEffect(workInProgress2, current), cutOffTailIfNeeded(newProps, true), null === newProps.tail && "hidden" === newProps.tailMode && !nextResource.alternate && !isHydrating)
                return bubbleProperties(workInProgress2), null;
            } else
              2 * now() - newProps.renderingStartTime > workInProgressRootRenderTargetTime && 536870912 !== renderLanes2 && (workInProgress2.flags |= 128, type = true, cutOffTailIfNeeded(newProps, false), workInProgress2.lanes = 4194304);
          newProps.isBackwards ? (nextResource.sibling = workInProgress2.child, workInProgress2.child = nextResource) : (current = newProps.last, null !== current ? current.sibling = nextResource : workInProgress2.child = nextResource, newProps.last = nextResource);
        }
        if (null !== newProps.tail)
          return current = newProps.tail, newProps.rendering = current, newProps.tail = current.sibling, newProps.renderingStartTime = now(), current.sibling = null, renderLanes2 = suspenseStackCursor.current, push(
            suspenseStackCursor,
            type ? renderLanes2 & 1 | 2 : renderLanes2 & 1
          ), isHydrating && pushTreeFork(workInProgress2, newProps.treeForkCount), current;
        bubbleProperties(workInProgress2);
        return null;
      case 22:
      case 23:
        return popSuspenseHandler(workInProgress2), popHiddenContext(), newProps = null !== workInProgress2.memoizedState, null !== current ? null !== current.memoizedState !== newProps && (workInProgress2.flags |= 8192) : newProps && (workInProgress2.flags |= 8192), newProps ? 0 !== (renderLanes2 & 536870912) && 0 === (workInProgress2.flags & 128) && (bubbleProperties(workInProgress2), workInProgress2.subtreeFlags & 6 && (workInProgress2.flags |= 8192)) : bubbleProperties(workInProgress2), renderLanes2 = workInProgress2.updateQueue, null !== renderLanes2 && scheduleRetryEffect(workInProgress2, renderLanes2.retryQueue), renderLanes2 = null, null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (renderLanes2 = current.memoizedState.cachePool.pool), newProps = null, null !== workInProgress2.memoizedState && null !== workInProgress2.memoizedState.cachePool && (newProps = workInProgress2.memoizedState.cachePool.pool), newProps !== renderLanes2 && (workInProgress2.flags |= 2048), null !== current && pop(resumedCache), null;
      case 24:
        return renderLanes2 = null, null !== current && (renderLanes2 = current.memoizedState.cache), workInProgress2.memoizedState.cache !== renderLanes2 && (workInProgress2.flags |= 2048), popProvider(CacheContext), bubbleProperties(workInProgress2), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(formatProdErrorMessage(156, workInProgress2.tag));
  }
  function unwindWork(current, workInProgress2) {
    popTreeContext(workInProgress2);
    switch (workInProgress2.tag) {
      case 1:
        return current = workInProgress2.flags, current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 3:
        return popProvider(CacheContext), popHostContainer(), current = workInProgress2.flags, 0 !== (current & 65536) && 0 === (current & 128) ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 26:
      case 27:
      case 5:
        return popHostContext(workInProgress2), null;
      case 31:
        if (null !== workInProgress2.memoizedState) {
          popSuspenseHandler(workInProgress2);
          if (null === workInProgress2.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress2.flags;
        return current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 13:
        popSuspenseHandler(workInProgress2);
        current = workInProgress2.memoizedState;
        if (null !== current && null !== current.dehydrated) {
          if (null === workInProgress2.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress2.flags;
        return current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 19:
        return pop(suspenseStackCursor), null;
      case 4:
        return popHostContainer(), null;
      case 10:
        return popProvider(workInProgress2.type), null;
      case 22:
      case 23:
        return popSuspenseHandler(workInProgress2), popHiddenContext(), null !== current && pop(resumedCache), current = workInProgress2.flags, current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 24:
        return popProvider(CacheContext), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function unwindInterruptedWork(current, interruptedWork) {
    popTreeContext(interruptedWork);
    switch (interruptedWork.tag) {
      case 3:
        popProvider(CacheContext);
        popHostContainer();
        break;
      case 26:
      case 27:
      case 5:
        popHostContext(interruptedWork);
        break;
      case 4:
        popHostContainer();
        break;
      case 31:
        null !== interruptedWork.memoizedState && popSuspenseHandler(interruptedWork);
        break;
      case 13:
        popSuspenseHandler(interruptedWork);
        break;
      case 19:
        pop(suspenseStackCursor);
        break;
      case 10:
        popProvider(interruptedWork.type);
        break;
      case 22:
      case 23:
        popSuspenseHandler(interruptedWork);
        popHiddenContext();
        null !== current && pop(resumedCache);
        break;
      case 24:
        popProvider(CacheContext);
    }
  }
  function commitHookEffectListMount(flags, finishedWork) {
    try {
      var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
      if (null !== lastEffect) {
        var firstEffect = lastEffect.next;
        updateQueue = firstEffect;
        do {
          if ((updateQueue.tag & flags) === flags) {
            lastEffect = void 0;
            var create = updateQueue.create, inst = updateQueue.inst;
            lastEffect = create();
            inst.destroy = lastEffect;
          }
          updateQueue = updateQueue.next;
        } while (updateQueue !== firstEffect);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor$jscomp$0) {
    try {
      var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
      if (null !== lastEffect) {
        var firstEffect = lastEffect.next;
        updateQueue = firstEffect;
        do {
          if ((updateQueue.tag & flags) === flags) {
            var inst = updateQueue.inst, destroy = inst.destroy;
            if (void 0 !== destroy) {
              inst.destroy = void 0;
              lastEffect = finishedWork;
              var nearestMountedAncestor = nearestMountedAncestor$jscomp$0, destroy_ = destroy;
              try {
                destroy_();
              } catch (error) {
                captureCommitPhaseError(
                  lastEffect,
                  nearestMountedAncestor,
                  error
                );
              }
            }
          }
          updateQueue = updateQueue.next;
        } while (updateQueue !== firstEffect);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitClassCallbacks(finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    if (null !== updateQueue) {
      var instance = finishedWork.stateNode;
      try {
        commitCallbacks(updateQueue, instance);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
  function safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance) {
    instance.props = resolveClassComponentProps(
      current.type,
      current.memoizedProps
    );
    instance.state = current.memoizedState;
    try {
      instance.componentWillUnmount();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function safelyAttachRef(current, nearestMountedAncestor) {
    try {
      var ref = current.ref;
      if (null !== ref) {
        switch (current.tag) {
          case 26:
          case 27:
          case 5:
            var instanceToUse = current.stateNode;
            break;
          case 30:
            instanceToUse = current.stateNode;
            break;
          default:
            instanceToUse = current.stateNode;
        }
        "function" === typeof ref ? current.refCleanup = ref(instanceToUse) : ref.current = instanceToUse;
      }
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function safelyDetachRef(current, nearestMountedAncestor) {
    var ref = current.ref, refCleanup = current.refCleanup;
    if (null !== ref)
      if ("function" === typeof refCleanup)
        try {
          refCleanup();
        } catch (error) {
          captureCommitPhaseError(current, nearestMountedAncestor, error);
        } finally {
          current.refCleanup = null, current = current.alternate, null != current && (current.refCleanup = null);
        }
      else if ("function" === typeof ref)
        try {
          ref(null);
        } catch (error$140) {
          captureCommitPhaseError(current, nearestMountedAncestor, error$140);
        }
      else ref.current = null;
  }
  function commitHostMount(finishedWork) {
    var type = finishedWork.type, props = finishedWork.memoizedProps, instance = finishedWork.stateNode;
    try {
      a: switch (type) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          props.autoFocus && instance.focus();
          break a;
        case "img":
          props.src ? instance.src = props.src : props.srcSet && (instance.srcset = props.srcSet);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHostUpdate(finishedWork, newProps, oldProps) {
    try {
      var domElement = finishedWork.stateNode;
      updateProperties(domElement, finishedWork.type, oldProps, newProps);
      domElement[internalPropsKey] = newProps;
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function isHostParent(fiber) {
    return 5 === fiber.tag || 3 === fiber.tag || 26 === fiber.tag || 27 === fiber.tag && isSingletonScope(fiber.type) || 4 === fiber.tag;
  }
  function getHostSibling(fiber) {
    a: for (; ; ) {
      for (; null === fiber.sibling; ) {
        if (null === fiber.return || isHostParent(fiber.return)) return null;
        fiber = fiber.return;
      }
      fiber.sibling.return = fiber.return;
      for (fiber = fiber.sibling; 5 !== fiber.tag && 6 !== fiber.tag && 18 !== fiber.tag; ) {
        if (27 === fiber.tag && isSingletonScope(fiber.type)) continue a;
        if (fiber.flags & 2) continue a;
        if (null === fiber.child || 4 === fiber.tag) continue a;
        else fiber.child.return = fiber, fiber = fiber.child;
      }
      if (!(fiber.flags & 2)) return fiber.stateNode;
    }
  }
  function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      node = node.stateNode, before ? (9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent).insertBefore(node, before) : (before = 9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent, before.appendChild(node), parent = parent._reactRootContainer, null !== parent && void 0 !== parent || null !== before.onclick || (before.onclick = noop$1));
    else if (4 !== tag && (27 === tag && isSingletonScope(node.type) && (parent = node.stateNode, before = null), node = node.child, null !== node))
      for (insertOrAppendPlacementNodeIntoContainer(node, before, parent), node = node.sibling; null !== node; )
        insertOrAppendPlacementNodeIntoContainer(node, before, parent), node = node.sibling;
  }
  function insertOrAppendPlacementNode(node, before, parent) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      node = node.stateNode, before ? parent.insertBefore(node, before) : parent.appendChild(node);
    else if (4 !== tag && (27 === tag && isSingletonScope(node.type) && (parent = node.stateNode), node = node.child, null !== node))
      for (insertOrAppendPlacementNode(node, before, parent), node = node.sibling; null !== node; )
        insertOrAppendPlacementNode(node, before, parent), node = node.sibling;
  }
  function commitHostSingletonAcquisition(finishedWork) {
    var singleton = finishedWork.stateNode, props = finishedWork.memoizedProps;
    try {
      for (var type = finishedWork.type, attributes = singleton.attributes; attributes.length; )
        singleton.removeAttributeNode(attributes[0]);
      setInitialProperties(singleton, type, props);
      singleton[internalInstanceKey] = finishedWork;
      singleton[internalPropsKey] = props;
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  var offscreenSubtreeIsHidden = false, offscreenSubtreeWasHidden = false, needsFormReset = false, PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set, nextEffect = null;
  function commitBeforeMutationEffects(root2, firstChild) {
    root2 = root2.containerInfo;
    eventsEnabled = _enabled;
    root2 = getActiveElementDeep(root2);
    if (hasSelectionCapabilities(root2)) {
      if ("selectionStart" in root2)
        var JSCompiler_temp = {
          start: root2.selectionStart,
          end: root2.selectionEnd
        };
      else
        a: {
          JSCompiler_temp = (JSCompiler_temp = root2.ownerDocument) && JSCompiler_temp.defaultView || window;
          var selection = JSCompiler_temp.getSelection && JSCompiler_temp.getSelection();
          if (selection && 0 !== selection.rangeCount) {
            JSCompiler_temp = selection.anchorNode;
            var anchorOffset = selection.anchorOffset, focusNode = selection.focusNode;
            selection = selection.focusOffset;
            try {
              JSCompiler_temp.nodeType, focusNode.nodeType;
            } catch (e$20) {
              JSCompiler_temp = null;
              break a;
            }
            var length = 0, start = -1, end = -1, indexWithinAnchor = 0, indexWithinFocus = 0, node = root2, parentNode = null;
            b: for (; ; ) {
              for (var next; ; ) {
                node !== JSCompiler_temp || 0 !== anchorOffset && 3 !== node.nodeType || (start = length + anchorOffset);
                node !== focusNode || 0 !== selection && 3 !== node.nodeType || (end = length + selection);
                3 === node.nodeType && (length += node.nodeValue.length);
                if (null === (next = node.firstChild)) break;
                parentNode = node;
                node = next;
              }
              for (; ; ) {
                if (node === root2) break b;
                parentNode === JSCompiler_temp && ++indexWithinAnchor === anchorOffset && (start = length);
                parentNode === focusNode && ++indexWithinFocus === selection && (end = length);
                if (null !== (next = node.nextSibling)) break;
                node = parentNode;
                parentNode = node.parentNode;
              }
              node = next;
            }
            JSCompiler_temp = -1 === start || -1 === end ? null : { start, end };
          } else JSCompiler_temp = null;
        }
      JSCompiler_temp = JSCompiler_temp || { start: 0, end: 0 };
    } else JSCompiler_temp = null;
    selectionInformation = { focusedElem: root2, selectionRange: JSCompiler_temp };
    _enabled = false;
    for (nextEffect = firstChild; null !== nextEffect; )
      if (firstChild = nextEffect, root2 = firstChild.child, 0 !== (firstChild.subtreeFlags & 1028) && null !== root2)
        root2.return = firstChild, nextEffect = root2;
      else
        for (; null !== nextEffect; ) {
          firstChild = nextEffect;
          focusNode = firstChild.alternate;
          root2 = firstChild.flags;
          switch (firstChild.tag) {
            case 0:
              if (0 !== (root2 & 4) && (root2 = firstChild.updateQueue, root2 = null !== root2 ? root2.events : null, null !== root2))
                for (JSCompiler_temp = 0; JSCompiler_temp < root2.length; JSCompiler_temp++)
                  anchorOffset = root2[JSCompiler_temp], anchorOffset.ref.impl = anchorOffset.nextImpl;
              break;
            case 11:
            case 15:
              break;
            case 1:
              if (0 !== (root2 & 1024) && null !== focusNode) {
                root2 = void 0;
                JSCompiler_temp = firstChild;
                anchorOffset = focusNode.memoizedProps;
                focusNode = focusNode.memoizedState;
                selection = JSCompiler_temp.stateNode;
                try {
                  var resolvedPrevProps = resolveClassComponentProps(
                    JSCompiler_temp.type,
                    anchorOffset
                  );
                  root2 = selection.getSnapshotBeforeUpdate(
                    resolvedPrevProps,
                    focusNode
                  );
                  selection.__reactInternalSnapshotBeforeUpdate = root2;
                } catch (error) {
                  captureCommitPhaseError(
                    JSCompiler_temp,
                    JSCompiler_temp.return,
                    error
                  );
                }
              }
              break;
            case 3:
              if (0 !== (root2 & 1024)) {
                if (root2 = firstChild.stateNode.containerInfo, JSCompiler_temp = root2.nodeType, 9 === JSCompiler_temp)
                  clearContainerSparingly(root2);
                else if (1 === JSCompiler_temp)
                  switch (root2.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      clearContainerSparingly(root2);
                      break;
                    default:
                      root2.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if (0 !== (root2 & 1024)) throw Error(formatProdErrorMessage(163));
          }
          root2 = firstChild.sibling;
          if (null !== root2) {
            root2.return = firstChild.return;
            nextEffect = root2;
            break;
          }
          nextEffect = firstChild.return;
        }
  }
  function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitHookEffectListMount(5, finishedWork);
        break;
      case 1:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 4)
          if (finishedRoot = finishedWork.stateNode, null === current)
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          else {
            var prevProps = resolveClassComponentProps(
              finishedWork.type,
              current.memoizedProps
            );
            current = current.memoizedState;
            try {
              finishedRoot.componentDidUpdate(
                prevProps,
                current,
                finishedRoot.__reactInternalSnapshotBeforeUpdate
              );
            } catch (error$139) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$139
              );
            }
          }
        flags & 64 && commitClassCallbacks(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 64 && (finishedRoot = finishedWork.updateQueue, null !== finishedRoot)) {
          current = null;
          if (null !== finishedWork.child)
            switch (finishedWork.child.tag) {
              case 27:
              case 5:
                current = finishedWork.child.stateNode;
                break;
              case 1:
                current = finishedWork.child.stateNode;
            }
          try {
            commitCallbacks(finishedRoot, current);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 27:
        null === current && flags & 4 && commitHostSingletonAcquisition(finishedWork);
      case 26:
      case 5:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        null === current && flags & 4 && commitHostMount(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        break;
      case 31:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
        break;
      case 13:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
        flags & 64 && (finishedRoot = finishedWork.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot && (finishedWork = retryDehydratedSuspenseBoundary.bind(
          null,
          finishedWork
        ), registerSuspenseInstanceRetry(finishedRoot, finishedWork))));
        break;
      case 22:
        flags = null !== finishedWork.memoizedState || offscreenSubtreeIsHidden;
        if (!flags) {
          current = null !== current && null !== current.memoizedState || offscreenSubtreeWasHidden;
          prevProps = offscreenSubtreeIsHidden;
          var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = flags;
          (offscreenSubtreeWasHidden = current) && !prevOffscreenSubtreeWasHidden ? recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            0 !== (finishedWork.subtreeFlags & 8772)
          ) : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          offscreenSubtreeIsHidden = prevProps;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        }
        break;
      case 30:
        break;
      default:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
    }
  }
  function detachFiberAfterEffects(fiber) {
    var alternate = fiber.alternate;
    null !== alternate && (fiber.alternate = null, detachFiberAfterEffects(alternate));
    fiber.child = null;
    fiber.deletions = null;
    fiber.sibling = null;
    5 === fiber.tag && (alternate = fiber.stateNode, null !== alternate && detachDeletedInstance(alternate));
    fiber.stateNode = null;
    fiber.return = null;
    fiber.dependencies = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;
  }
  var hostParent = null, hostParentIsContainer = false;
  function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
    for (parent = parent.child; null !== parent; )
      commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent), parent = parent.sibling;
  }
  function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
      try {
        injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
      } catch (err) {
      }
    switch (deletedFiber.tag) {
      case 26:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        deletedFiber.memoizedState ? deletedFiber.memoizedState.count-- : deletedFiber.stateNode && (deletedFiber = deletedFiber.stateNode, deletedFiber.parentNode.removeChild(deletedFiber));
        break;
      case 27:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        var prevHostParent = hostParent, prevHostParentIsContainer = hostParentIsContainer;
        isSingletonScope(deletedFiber.type) && (hostParent = deletedFiber.stateNode, hostParentIsContainer = false);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        releaseSingletonInstance(deletedFiber.stateNode);
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        break;
      case 5:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
      case 6:
        prevHostParent = hostParent;
        prevHostParentIsContainer = hostParentIsContainer;
        hostParent = null;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        if (null !== hostParent)
          if (hostParentIsContainer)
            try {
              (9 === hostParent.nodeType ? hostParent.body : "HTML" === hostParent.nodeName ? hostParent.ownerDocument.body : hostParent).removeChild(deletedFiber.stateNode);
            } catch (error) {
              captureCommitPhaseError(
                deletedFiber,
                nearestMountedAncestor,
                error
              );
            }
          else
            try {
              hostParent.removeChild(deletedFiber.stateNode);
            } catch (error) {
              captureCommitPhaseError(
                deletedFiber,
                nearestMountedAncestor,
                error
              );
            }
        break;
      case 18:
        null !== hostParent && (hostParentIsContainer ? (finishedRoot = hostParent, clearHydrationBoundary(
          9 === finishedRoot.nodeType ? finishedRoot.body : "HTML" === finishedRoot.nodeName ? finishedRoot.ownerDocument.body : finishedRoot,
          deletedFiber.stateNode
        ), retryIfBlockedOn(finishedRoot)) : clearHydrationBoundary(hostParent, deletedFiber.stateNode));
        break;
      case 4:
        prevHostParent = hostParent;
        prevHostParentIsContainer = hostParentIsContainer;
        hostParent = deletedFiber.stateNode.containerInfo;
        hostParentIsContainer = true;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
        offscreenSubtreeWasHidden || commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 1:
        offscreenSubtreeWasHidden || (safelyDetachRef(deletedFiber, nearestMountedAncestor), prevHostParent = deletedFiber.stateNode, "function" === typeof prevHostParent.componentWillUnmount && safelyCallComponentWillUnmount(
          deletedFiber,
          nearestMountedAncestor,
          prevHostParent
        ));
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 21:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 22:
        offscreenSubtreeWasHidden = (prevHostParent = offscreenSubtreeWasHidden) || null !== deletedFiber.memoizedState;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        offscreenSubtreeWasHidden = prevHostParent;
        break;
      default:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
    }
  }
  function commitActivityHydrationCallbacks(finishedRoot, finishedWork) {
    if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot))) {
      finishedRoot = finishedRoot.dehydrated;
      try {
        retryIfBlockedOn(finishedRoot);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
  function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
    if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot))))
      try {
        retryIfBlockedOn(finishedRoot);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
  }
  function getRetryCache(finishedWork) {
    switch (finishedWork.tag) {
      case 31:
      case 13:
      case 19:
        var retryCache = finishedWork.stateNode;
        null === retryCache && (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
        return retryCache;
      case 22:
        return finishedWork = finishedWork.stateNode, retryCache = finishedWork._retryCache, null === retryCache && (retryCache = finishedWork._retryCache = new PossiblyWeakSet()), retryCache;
      default:
        throw Error(formatProdErrorMessage(435, finishedWork.tag));
    }
  }
  function attachSuspenseRetryListeners(finishedWork, wakeables) {
    var retryCache = getRetryCache(finishedWork);
    wakeables.forEach(function(wakeable) {
      if (!retryCache.has(wakeable)) {
        retryCache.add(wakeable);
        var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
        wakeable.then(retry, retry);
      }
    });
  }
  function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber) {
    var deletions = parentFiber.deletions;
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i], root2 = root$jscomp$0, returnFiber = parentFiber, parent = returnFiber;
        a: for (; null !== parent; ) {
          switch (parent.tag) {
            case 27:
              if (isSingletonScope(parent.type)) {
                hostParent = parent.stateNode;
                hostParentIsContainer = false;
                break a;
              }
              break;
            case 5:
              hostParent = parent.stateNode;
              hostParentIsContainer = false;
              break a;
            case 3:
            case 4:
              hostParent = parent.stateNode.containerInfo;
              hostParentIsContainer = true;
              break a;
          }
          parent = parent.return;
        }
        if (null === hostParent) throw Error(formatProdErrorMessage(160));
        commitDeletionEffectsOnFiber(root2, returnFiber, childToDelete);
        hostParent = null;
        hostParentIsContainer = false;
        root2 = childToDelete.alternate;
        null !== root2 && (root2.return = null);
        childToDelete.return = null;
      }
    if (parentFiber.subtreeFlags & 13886)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitMutationEffectsOnFiber(parentFiber, root$jscomp$0), parentFiber = parentFiber.sibling;
  }
  var currentHoistableRoot = null;
  function commitMutationEffectsOnFiber(finishedWork, root2) {
    var current = finishedWork.alternate, flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (commitHookEffectListUnmount(3, finishedWork, finishedWork.return), commitHookEffectListMount(3, finishedWork), commitHookEffectListUnmount(5, finishedWork, finishedWork.return));
        break;
      case 1:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        flags & 64 && offscreenSubtreeIsHidden && (finishedWork = finishedWork.updateQueue, null !== finishedWork && (flags = finishedWork.callbacks, null !== flags && (current = finishedWork.shared.hiddenCallbacks, finishedWork.shared.hiddenCallbacks = null === current ? flags : current.concat(flags))));
        break;
      case 26:
        var hoistableRoot = currentHoistableRoot;
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        if (flags & 4) {
          var currentResource = null !== current ? current.memoizedState : null;
          flags = finishedWork.memoizedState;
          if (null === current)
            if (null === flags)
              if (null === finishedWork.stateNode) {
                a: {
                  flags = finishedWork.type;
                  current = finishedWork.memoizedProps;
                  hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
                  b: switch (flags) {
                    case "title":
                      currentResource = hoistableRoot.getElementsByTagName("title")[0];
                      if (!currentResource || currentResource[internalHoistableMarker] || currentResource[internalInstanceKey] || "http://www.w3.org/2000/svg" === currentResource.namespaceURI || currentResource.hasAttribute("itemprop"))
                        currentResource = hoistableRoot.createElement(flags), hoistableRoot.head.insertBefore(
                          currentResource,
                          hoistableRoot.querySelector("head > title")
                        );
                      setInitialProperties(currentResource, flags, current);
                      currentResource[internalInstanceKey] = finishedWork;
                      markNodeAsHoistable(currentResource);
                      flags = currentResource;
                      break a;
                    case "link":
                      var maybeNodes = getHydratableHoistableCache(
                        "link",
                        "href",
                        hoistableRoot
                      ).get(flags + (current.href || ""));
                      if (maybeNodes) {
                        for (var i = 0; i < maybeNodes.length; i++)
                          if (currentResource = maybeNodes[i], currentResource.getAttribute("href") === (null == current.href || "" === current.href ? null : current.href) && currentResource.getAttribute("rel") === (null == current.rel ? null : current.rel) && currentResource.getAttribute("title") === (null == current.title ? null : current.title) && currentResource.getAttribute("crossorigin") === (null == current.crossOrigin ? null : current.crossOrigin)) {
                            maybeNodes.splice(i, 1);
                            break b;
                          }
                      }
                      currentResource = hoistableRoot.createElement(flags);
                      setInitialProperties(currentResource, flags, current);
                      hoistableRoot.head.appendChild(currentResource);
                      break;
                    case "meta":
                      if (maybeNodes = getHydratableHoistableCache(
                        "meta",
                        "content",
                        hoistableRoot
                      ).get(flags + (current.content || ""))) {
                        for (i = 0; i < maybeNodes.length; i++)
                          if (currentResource = maybeNodes[i], currentResource.getAttribute("content") === (null == current.content ? null : "" + current.content) && currentResource.getAttribute("name") === (null == current.name ? null : current.name) && currentResource.getAttribute("property") === (null == current.property ? null : current.property) && currentResource.getAttribute("http-equiv") === (null == current.httpEquiv ? null : current.httpEquiv) && currentResource.getAttribute("charset") === (null == current.charSet ? null : current.charSet)) {
                            maybeNodes.splice(i, 1);
                            break b;
                          }
                      }
                      currentResource = hoistableRoot.createElement(flags);
                      setInitialProperties(currentResource, flags, current);
                      hoistableRoot.head.appendChild(currentResource);
                      break;
                    default:
                      throw Error(formatProdErrorMessage(468, flags));
                  }
                  currentResource[internalInstanceKey] = finishedWork;
                  markNodeAsHoistable(currentResource);
                  flags = currentResource;
                }
                finishedWork.stateNode = flags;
              } else
                mountHoistable(
                  hoistableRoot,
                  finishedWork.type,
                  finishedWork.stateNode
                );
            else
              finishedWork.stateNode = acquireResource(
                hoistableRoot,
                flags,
                finishedWork.memoizedProps
              );
          else
            currentResource !== flags ? (null === currentResource ? null !== current.stateNode && (current = current.stateNode, current.parentNode.removeChild(current)) : currentResource.count--, null === flags ? mountHoistable(
              hoistableRoot,
              finishedWork.type,
              finishedWork.stateNode
            ) : acquireResource(
              hoistableRoot,
              flags,
              finishedWork.memoizedProps
            )) : null === flags && null !== finishedWork.stateNode && commitHostUpdate(
              finishedWork,
              finishedWork.memoizedProps,
              current.memoizedProps
            );
        }
        break;
      case 27:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        null !== current && flags & 4 && commitHostUpdate(
          finishedWork,
          finishedWork.memoizedProps,
          current.memoizedProps
        );
        break;
      case 5:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        if (finishedWork.flags & 32) {
          hoistableRoot = finishedWork.stateNode;
          try {
            setTextContent(hoistableRoot, "");
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        flags & 4 && null != finishedWork.stateNode && (hoistableRoot = finishedWork.memoizedProps, commitHostUpdate(
          finishedWork,
          hoistableRoot,
          null !== current ? current.memoizedProps : hoistableRoot
        ));
        flags & 1024 && (needsFormReset = true);
        break;
      case 6:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & 4) {
          if (null === finishedWork.stateNode)
            throw Error(formatProdErrorMessage(162));
          flags = finishedWork.memoizedProps;
          current = finishedWork.stateNode;
          try {
            current.nodeValue = flags;
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 3:
        tagCaches = null;
        hoistableRoot = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(root2.containerInfo);
        recursivelyTraverseMutationEffects(root2, finishedWork);
        currentHoistableRoot = hoistableRoot;
        commitReconciliationEffects(finishedWork);
        if (flags & 4 && null !== current && current.memoizedState.isDehydrated)
          try {
            retryIfBlockedOn(root2.containerInfo);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        needsFormReset && (needsFormReset = false, recursivelyResetForms(finishedWork));
        break;
      case 4:
        flags = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(
          finishedWork.stateNode.containerInfo
        );
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        currentHoistableRoot = flags;
        break;
      case 12:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        break;
      case 31:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 13:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        finishedWork.child.flags & 8192 && null !== finishedWork.memoizedState !== (null !== current && null !== current.memoizedState) && (globalMostRecentFallbackTime = now());
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 22:
        hoistableRoot = null !== finishedWork.memoizedState;
        var wasHidden = null !== current && null !== current.memoizedState, prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden, prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || hoistableRoot;
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
        recursivelyTraverseMutationEffects(root2, finishedWork);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
        commitReconciliationEffects(finishedWork);
        if (flags & 8192)
          a: for (root2 = finishedWork.stateNode, root2._visibility = hoistableRoot ? root2._visibility & -2 : root2._visibility | 1, hoistableRoot && (null === current || wasHidden || offscreenSubtreeIsHidden || offscreenSubtreeWasHidden || recursivelyTraverseDisappearLayoutEffects(finishedWork)), current = null, root2 = finishedWork; ; ) {
            if (5 === root2.tag || 26 === root2.tag) {
              if (null === current) {
                wasHidden = current = root2;
                try {
                  if (currentResource = wasHidden.stateNode, hoistableRoot)
                    maybeNodes = currentResource.style, "function" === typeof maybeNodes.setProperty ? maybeNodes.setProperty("display", "none", "important") : maybeNodes.display = "none";
                  else {
                    i = wasHidden.stateNode;
                    var styleProp = wasHidden.memoizedProps.style, display = void 0 !== styleProp && null !== styleProp && styleProp.hasOwnProperty("display") ? styleProp.display : null;
                    i.style.display = null == display || "boolean" === typeof display ? "" : ("" + display).trim();
                  }
                } catch (error) {
                  captureCommitPhaseError(wasHidden, wasHidden.return, error);
                }
              }
            } else if (6 === root2.tag) {
              if (null === current) {
                wasHidden = root2;
                try {
                  wasHidden.stateNode.nodeValue = hoistableRoot ? "" : wasHidden.memoizedProps;
                } catch (error) {
                  captureCommitPhaseError(wasHidden, wasHidden.return, error);
                }
              }
            } else if (18 === root2.tag) {
              if (null === current) {
                wasHidden = root2;
                try {
                  var instance = wasHidden.stateNode;
                  hoistableRoot ? hideOrUnhideDehydratedBoundary(instance, true) : hideOrUnhideDehydratedBoundary(wasHidden.stateNode, false);
                } catch (error) {
                  captureCommitPhaseError(wasHidden, wasHidden.return, error);
                }
              }
            } else if ((22 !== root2.tag && 23 !== root2.tag || null === root2.memoizedState || root2 === finishedWork) && null !== root2.child) {
              root2.child.return = root2;
              root2 = root2.child;
              continue;
            }
            if (root2 === finishedWork) break a;
            for (; null === root2.sibling; ) {
              if (null === root2.return || root2.return === finishedWork) break a;
              current === root2 && (current = null);
              root2 = root2.return;
            }
            current === root2 && (current = null);
            root2.sibling.return = root2.return;
            root2 = root2.sibling;
          }
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (current = flags.retryQueue, null !== current && (flags.retryQueue = null, attachSuspenseRetryListeners(finishedWork, current))));
        break;
      case 19:
        recursivelyTraverseMutationEffects(root2, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (flags = finishedWork.updateQueue, null !== flags && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        recursivelyTraverseMutationEffects(root2, finishedWork), commitReconciliationEffects(finishedWork);
    }
  }
  function commitReconciliationEffects(finishedWork) {
    var flags = finishedWork.flags;
    if (flags & 2) {
      try {
        for (var hostParentFiber, parentFiber = finishedWork.return; null !== parentFiber; ) {
          if (isHostParent(parentFiber)) {
            hostParentFiber = parentFiber;
            break;
          }
          parentFiber = parentFiber.return;
        }
        if (null == hostParentFiber) throw Error(formatProdErrorMessage(160));
        switch (hostParentFiber.tag) {
          case 27:
            var parent = hostParentFiber.stateNode, before = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(finishedWork, before, parent);
            break;
          case 5:
            var parent$141 = hostParentFiber.stateNode;
            hostParentFiber.flags & 32 && (setTextContent(parent$141, ""), hostParentFiber.flags &= -33);
            var before$142 = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(finishedWork, before$142, parent$141);
            break;
          case 3:
          case 4:
            var parent$143 = hostParentFiber.stateNode.containerInfo, before$144 = getHostSibling(finishedWork);
            insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              before$144,
              parent$143
            );
            break;
          default:
            throw Error(formatProdErrorMessage(161));
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
      finishedWork.flags &= -3;
    }
    flags & 4096 && (finishedWork.flags &= -4097);
  }
  function recursivelyResetForms(parentFiber) {
    if (parentFiber.subtreeFlags & 1024)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var fiber = parentFiber;
        recursivelyResetForms(fiber);
        5 === fiber.tag && fiber.flags & 1024 && fiber.stateNode.reset();
        parentFiber = parentFiber.sibling;
      }
  }
  function recursivelyTraverseLayoutEffects(root2, parentFiber) {
    if (parentFiber.subtreeFlags & 8772)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitLayoutEffectOnFiber(root2, parentFiber.alternate, parentFiber), parentFiber = parentFiber.sibling;
  }
  function recursivelyTraverseDisappearLayoutEffects(parentFiber) {
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedWork = parentFiber;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 1:
          safelyDetachRef(finishedWork, finishedWork.return);
          var instance = finishedWork.stateNode;
          "function" === typeof instance.componentWillUnmount && safelyCallComponentWillUnmount(
            finishedWork,
            finishedWork.return,
            instance
          );
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 27:
          releaseSingletonInstance(finishedWork.stateNode);
        case 26:
        case 5:
          safelyDetachRef(finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 22:
          null === finishedWork.memoizedState && recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 30:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        default:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseReappearLayoutEffects(finishedRoot$jscomp$0, parentFiber, includeWorkInProgressEffects) {
    includeWorkInProgressEffects = includeWorkInProgressEffects && 0 !== (parentFiber.subtreeFlags & 8772);
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var current = parentFiber.alternate, finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          commitHookEffectListMount(4, finishedWork);
          break;
        case 1:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          current = finishedWork;
          finishedRoot = current.stateNode;
          if ("function" === typeof finishedRoot.componentDidMount)
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(current, current.return, error);
            }
          current = finishedWork;
          finishedRoot = current.updateQueue;
          if (null !== finishedRoot) {
            var instance = current.stateNode;
            try {
              var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
              if (null !== hiddenCallbacks)
                for (finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0; finishedRoot < hiddenCallbacks.length; finishedRoot++)
                  callCallback(hiddenCallbacks[finishedRoot], instance);
            } catch (error) {
              captureCommitPhaseError(current, current.return, error);
            }
          }
          includeWorkInProgressEffects && flags & 64 && commitClassCallbacks(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 27:
          commitHostSingletonAcquisition(finishedWork);
        case 26:
        case 5:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && null === current && flags & 4 && commitHostMount(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 12:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          break;
        case 31:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 13:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 22:
          null === finishedWork.memoizedState && recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 30:
          break;
        default:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitOffscreenPassiveMountEffects(current, finishedWork) {
    var previousCache = null;
    null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (previousCache = current.memoizedState.cachePool.pool);
    current = null;
    null !== finishedWork.memoizedState && null !== finishedWork.memoizedState.cachePool && (current = finishedWork.memoizedState.cachePool.pool);
    current !== previousCache && (null != current && current.refCount++, null != previousCache && releaseCache(previousCache));
  }
  function commitCachePassiveMountEffect(current, finishedWork) {
    current = null;
    null !== finishedWork.alternate && (current = finishedWork.alternate.memoizedState.cache);
    finishedWork = finishedWork.memoizedState.cache;
    finishedWork !== current && (finishedWork.refCount++, null != current && releaseCache(current));
  }
  function recursivelyTraversePassiveMountEffects(root2, parentFiber, committedLanes, committedTransitions) {
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveMountOnFiber(
          root2,
          parentFiber,
          committedLanes,
          committedTransitions
        ), parentFiber = parentFiber.sibling;
  }
  function commitPassiveMountOnFiber(finishedRoot, finishedWork, committedLanes, committedTransitions) {
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && commitHookEffectListMount(9, finishedWork);
        break;
      case 1:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 3:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && (finishedRoot = null, null !== finishedWork.alternate && (finishedRoot = finishedWork.alternate.memoizedState.cache), finishedWork = finishedWork.memoizedState.cache, finishedWork !== finishedRoot && (finishedWork.refCount++, null != finishedRoot && releaseCache(finishedRoot)));
        break;
      case 12:
        if (flags & 2048) {
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
          finishedRoot = finishedWork.stateNode;
          try {
            var _finishedWork$memoize2 = finishedWork.memoizedProps, id = _finishedWork$memoize2.id, onPostCommit = _finishedWork$memoize2.onPostCommit;
            "function" === typeof onPostCommit && onPostCommit(
              id,
              null === finishedWork.alternate ? "mount" : "update",
              finishedRoot.passiveEffectDuration,
              -0
            );
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        } else
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
        break;
      case 31:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 13:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 23:
        break;
      case 22:
        _finishedWork$memoize2 = finishedWork.stateNode;
        id = finishedWork.alternate;
        null !== finishedWork.memoizedState ? _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        ) : recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork) : _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        ) : (_finishedWork$memoize2._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          0 !== (finishedWork.subtreeFlags & 10256) || false
        ));
        flags & 2048 && commitOffscreenPassiveMountEffects(id, finishedWork);
        break;
      case 24:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
        break;
      default:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
    }
  }
  function recursivelyTraverseReconnectPassiveEffects(finishedRoot$jscomp$0, parentFiber, committedLanes$jscomp$0, committedTransitions$jscomp$0, includeWorkInProgressEffects) {
    includeWorkInProgressEffects = includeWorkInProgressEffects && (0 !== (parentFiber.subtreeFlags & 10256) || false);
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, committedLanes = committedLanes$jscomp$0, committedTransitions = committedTransitions$jscomp$0, flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          commitHookEffectListMount(8, finishedWork);
          break;
        case 23:
          break;
        case 22:
          var instance = finishedWork.stateNode;
          null !== finishedWork.memoizedState ? instance._visibility & 2 ? recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          ) : recursivelyTraverseAtomicPassiveEffects(
            finishedRoot,
            finishedWork
          ) : (instance._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          ));
          includeWorkInProgressEffects && flags & 2048 && commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork
          );
          break;
        case 24:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseAtomicPassiveEffects(finishedRoot$jscomp$0, parentFiber) {
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags;
        switch (finishedWork.tag) {
          case 22:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 && commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork
            );
            break;
          case 24:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
            break;
          default:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
        }
        parentFiber = parentFiber.sibling;
      }
  }
  var suspenseyCommitFlag = 8192;
  function recursivelyAccumulateSuspenseyCommit(parentFiber, committedLanes, suspendedState) {
    if (parentFiber.subtreeFlags & suspenseyCommitFlag)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        accumulateSuspenseyCommitOnFiber(
          parentFiber,
          committedLanes,
          suspendedState
        ), parentFiber = parentFiber.sibling;
  }
  function accumulateSuspenseyCommitOnFiber(fiber, committedLanes, suspendedState) {
    switch (fiber.tag) {
      case 26:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        fiber.flags & suspenseyCommitFlag && null !== fiber.memoizedState && suspendResource(
          suspendedState,
          currentHoistableRoot,
          fiber.memoizedState,
          fiber.memoizedProps
        );
        break;
      case 5:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        break;
      case 3:
      case 4:
        var previousHoistableRoot = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(fiber.stateNode.containerInfo);
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        currentHoistableRoot = previousHoistableRoot;
        break;
      case 22:
        null === fiber.memoizedState && (previousHoistableRoot = fiber.alternate, null !== previousHoistableRoot && null !== previousHoistableRoot.memoizedState ? (previousHoistableRoot = suspenseyCommitFlag, suspenseyCommitFlag = 16777216, recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        ), suspenseyCommitFlag = previousHoistableRoot) : recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        ));
        break;
      default:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
    }
  }
  function detachAlternateSiblings(parentFiber) {
    var previousFiber = parentFiber.alternate;
    if (null !== previousFiber && (parentFiber = previousFiber.child, null !== parentFiber)) {
      previousFiber.child = null;
      do
        previousFiber = parentFiber.sibling, parentFiber.sibling = null, parentFiber = previousFiber;
      while (null !== parentFiber);
    }
  }
  function recursivelyTraversePassiveUnmountEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveUnmountOnFiber(parentFiber), parentFiber = parentFiber.sibling;
  }
  function commitPassiveUnmountOnFiber(finishedWork) {
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        finishedWork.flags & 2048 && commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 12:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState && instance._visibility & 2 && (null === finishedWork.return || 13 !== finishedWork.return.tag) ? (instance._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(finishedWork)) : recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      default:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
    }
  }
  function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      deletions = parentFiber;
      switch (deletions.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, deletions, deletions.return);
          recursivelyTraverseDisconnectPassiveEffects(deletions);
          break;
        case 22:
          i = deletions.stateNode;
          i._visibility & 2 && (i._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(deletions));
          break;
        default:
          recursivelyTraverseDisconnectPassiveEffects(deletions);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(deletedSubtreeRoot, nearestMountedAncestor) {
    for (; null !== nextEffect; ) {
      var fiber = nextEffect;
      switch (fiber.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
          break;
        case 23:
        case 22:
          if (null !== fiber.memoizedState && null !== fiber.memoizedState.cachePool) {
            var cache = fiber.memoizedState.cachePool.pool;
            null != cache && cache.refCount++;
          }
          break;
        case 24:
          releaseCache(fiber.memoizedState.cache);
      }
      cache = fiber.child;
      if (null !== cache) cache.return = fiber, nextEffect = cache;
      else
        a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
          cache = nextEffect;
          var sibling = cache.sibling, returnFiber = cache.return;
          detachFiberAfterEffects(cache);
          if (cache === fiber) {
            nextEffect = null;
            break a;
          }
          if (null !== sibling) {
            sibling.return = returnFiber;
            nextEffect = sibling;
            break a;
          }
          nextEffect = returnFiber;
        }
    }
  }
  var DefaultAsyncDispatcher = {
    getCacheForType: function(resourceType) {
      var cache = readContext(CacheContext), cacheForType = cache.data.get(resourceType);
      void 0 === cacheForType && (cacheForType = resourceType(), cache.data.set(resourceType, cacheForType));
      return cacheForType;
    },
    cacheSignal: function() {
      return readContext(CacheContext).controller.signal;
    }
  }, PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map, executionContext = 0, workInProgressRoot = null, workInProgress = null, workInProgressRootRenderLanes = 0, workInProgressSuspendedReason = 0, workInProgressThrownValue = null, workInProgressRootDidSkipSuspendedSiblings = false, workInProgressRootIsPrerendering = false, workInProgressRootDidAttachPingListener = false, entangledRenderLanes = 0, workInProgressRootExitStatus = 0, workInProgressRootSkippedLanes = 0, workInProgressRootInterleavedUpdatedLanes = 0, workInProgressRootPingedLanes = 0, workInProgressDeferredLane = 0, workInProgressSuspendedRetryLanes = 0, workInProgressRootConcurrentErrors = null, workInProgressRootRecoverableErrors = null, workInProgressRootDidIncludeRecursiveRenderUpdate = false, globalMostRecentFallbackTime = 0, globalMostRecentTransitionTime = 0, workInProgressRootRenderTargetTime = Infinity, workInProgressTransitions = null, legacyErrorBoundariesThatAlreadyFailed = null, pendingEffectsStatus = 0, pendingEffectsRoot = null, pendingFinishedWork = null, pendingEffectsLanes = 0, pendingEffectsRemainingLanes = 0, pendingPassiveTransitions = null, pendingRecoverableErrors = null, nestedUpdateCount = 0, rootWithNestedUpdates = null;
  function requestUpdateLane() {
    return 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes : null !== ReactSharedInternals.T ? requestTransitionLane() : resolveUpdatePriority();
  }
  function requestDeferredLane() {
    if (0 === workInProgressDeferredLane)
      if (0 === (workInProgressRootRenderLanes & 536870912) || isHydrating) {
        var lane = nextTransitionDeferredLane;
        nextTransitionDeferredLane <<= 1;
        0 === (nextTransitionDeferredLane & 3932160) && (nextTransitionDeferredLane = 262144);
        workInProgressDeferredLane = lane;
      } else workInProgressDeferredLane = 536870912;
    lane = suspenseHandlerStackCursor.current;
    null !== lane && (lane.flags |= 32);
    return workInProgressDeferredLane;
  }
  function scheduleUpdateOnFiber(root2, fiber, lane) {
    if (root2 === workInProgressRoot && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root2.cancelPendingCommit)
      prepareFreshStack(root2, 0), markRootSuspended(
        root2,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        false
      );
    markRootUpdated$1(root2, lane);
    if (0 === (executionContext & 2) || root2 !== workInProgressRoot)
      root2 === workInProgressRoot && (0 === (executionContext & 2) && (workInProgressRootInterleavedUpdatedLanes |= lane), 4 === workInProgressRootExitStatus && markRootSuspended(
        root2,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        false
      )), ensureRootIsScheduled(root2);
  }
  function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    var shouldTimeSlice = !forceSync && 0 === (lanes & 127) && 0 === (lanes & root$jscomp$0.expiredLanes) || checkIfRootIsPrerendering(root$jscomp$0, lanes), exitStatus = shouldTimeSlice ? renderRootConcurrent(root$jscomp$0, lanes) : renderRootSync(root$jscomp$0, lanes, true), renderWasConcurrent = shouldTimeSlice;
    do {
      if (0 === exitStatus) {
        workInProgressRootIsPrerendering && !shouldTimeSlice && markRootSuspended(root$jscomp$0, lanes, 0, false);
        break;
      } else {
        forceSync = root$jscomp$0.current.alternate;
        if (renderWasConcurrent && !isRenderConsistentWithExternalStores(forceSync)) {
          exitStatus = renderRootSync(root$jscomp$0, lanes, false);
          renderWasConcurrent = false;
          continue;
        }
        if (2 === exitStatus) {
          renderWasConcurrent = lanes;
          if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
            var JSCompiler_inline_result = 0;
          else
            JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913, JSCompiler_inline_result = 0 !== JSCompiler_inline_result ? JSCompiler_inline_result : JSCompiler_inline_result & 536870912 ? 536870912 : 0;
          if (0 !== JSCompiler_inline_result) {
            lanes = JSCompiler_inline_result;
            a: {
              var root2 = root$jscomp$0;
              exitStatus = workInProgressRootConcurrentErrors;
              var wasRootDehydrated = root2.current.memoizedState.isDehydrated;
              wasRootDehydrated && (prepareFreshStack(root2, JSCompiler_inline_result).flags |= 256);
              JSCompiler_inline_result = renderRootSync(
                root2,
                JSCompiler_inline_result,
                false
              );
              if (2 !== JSCompiler_inline_result) {
                if (workInProgressRootDidAttachPingListener && !wasRootDehydrated) {
                  root2.errorRecoveryDisabledLanes |= renderWasConcurrent;
                  workInProgressRootInterleavedUpdatedLanes |= renderWasConcurrent;
                  exitStatus = 4;
                  break a;
                }
                renderWasConcurrent = workInProgressRootRecoverableErrors;
                workInProgressRootRecoverableErrors = exitStatus;
                null !== renderWasConcurrent && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = renderWasConcurrent : workInProgressRootRecoverableErrors.push.apply(
                  workInProgressRootRecoverableErrors,
                  renderWasConcurrent
                ));
              }
              exitStatus = JSCompiler_inline_result;
            }
            renderWasConcurrent = false;
            if (2 !== exitStatus) continue;
          }
        }
        if (1 === exitStatus) {
          prepareFreshStack(root$jscomp$0, 0);
          markRootSuspended(root$jscomp$0, lanes, 0, true);
          break;
        }
        a: {
          shouldTimeSlice = root$jscomp$0;
          renderWasConcurrent = exitStatus;
          switch (renderWasConcurrent) {
            case 0:
            case 1:
              throw Error(formatProdErrorMessage(345));
            case 4:
              if ((lanes & 4194048) !== lanes) break;
            case 6:
              markRootSuspended(
                shouldTimeSlice,
                lanes,
                workInProgressDeferredLane,
                !workInProgressRootDidSkipSuspendedSiblings
              );
              break a;
            case 2:
              workInProgressRootRecoverableErrors = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(formatProdErrorMessage(329));
          }
          if ((lanes & 62914560) === lanes && (exitStatus = globalMostRecentFallbackTime + 300 - now(), 10 < exitStatus)) {
            markRootSuspended(
              shouldTimeSlice,
              lanes,
              workInProgressDeferredLane,
              !workInProgressRootDidSkipSuspendedSiblings
            );
            if (0 !== getNextLanes(shouldTimeSlice, 0, true)) break a;
            pendingEffectsLanes = lanes;
            shouldTimeSlice.timeoutHandle = scheduleTimeout(
              commitRootWhenReady.bind(
                null,
                shouldTimeSlice,
                forceSync,
                workInProgressRootRecoverableErrors,
                workInProgressTransitions,
                workInProgressRootDidIncludeRecursiveRenderUpdate,
                lanes,
                workInProgressDeferredLane,
                workInProgressRootInterleavedUpdatedLanes,
                workInProgressSuspendedRetryLanes,
                workInProgressRootDidSkipSuspendedSiblings,
                renderWasConcurrent,
                "Throttled",
                -0,
                0
              ),
              exitStatus
            );
            break a;
          }
          commitRootWhenReady(
            shouldTimeSlice,
            forceSync,
            workInProgressRootRecoverableErrors,
            workInProgressTransitions,
            workInProgressRootDidIncludeRecursiveRenderUpdate,
            lanes,
            workInProgressDeferredLane,
            workInProgressRootInterleavedUpdatedLanes,
            workInProgressSuspendedRetryLanes,
            workInProgressRootDidSkipSuspendedSiblings,
            renderWasConcurrent,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (1);
    ensureRootIsScheduled(root$jscomp$0);
  }
  function commitRootWhenReady(root2, finishedWork, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedCommitReason, completedRenderStartTime, completedRenderEndTime) {
    root2.timeoutHandle = -1;
    suspendedCommitReason = finishedWork.subtreeFlags;
    if (suspendedCommitReason & 8192 || 16785408 === (suspendedCommitReason & 16785408)) {
      suspendedCommitReason = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: true,
        waitingForViewTransition: false,
        unsuspend: noop$1
      };
      accumulateSuspenseyCommitOnFiber(
        finishedWork,
        lanes,
        suspendedCommitReason
      );
      var timeoutOffset = (lanes & 62914560) === lanes ? globalMostRecentFallbackTime - now() : (lanes & 4194048) === lanes ? globalMostRecentTransitionTime - now() : 0;
      timeoutOffset = waitForCommitToBeReady(
        suspendedCommitReason,
        timeoutOffset
      );
      if (null !== timeoutOffset) {
        pendingEffectsLanes = lanes;
        root2.cancelPendingCommit = timeoutOffset(
          commitRoot.bind(
            null,
            root2,
            finishedWork,
            lanes,
            recoverableErrors,
            transitions,
            didIncludeRenderPhaseUpdate,
            spawnedLane,
            updatedLanes,
            suspendedRetryLanes,
            exitStatus,
            suspendedCommitReason,
            null,
            completedRenderStartTime,
            completedRenderEndTime
          )
        );
        markRootSuspended(root2, lanes, spawnedLane, !didSkipSuspendedSiblings);
        return;
      }
    }
    commitRoot(
      root2,
      finishedWork,
      lanes,
      recoverableErrors,
      transitions,
      didIncludeRenderPhaseUpdate,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes
    );
  }
  function isRenderConsistentWithExternalStores(finishedWork) {
    for (var node = finishedWork; ; ) {
      var tag = node.tag;
      if ((0 === tag || 11 === tag || 15 === tag) && node.flags & 16384 && (tag = node.updateQueue, null !== tag && (tag = tag.stores, null !== tag)))
        for (var i = 0; i < tag.length; i++) {
          var check = tag[i], getSnapshot = check.getSnapshot;
          check = check.value;
          try {
            if (!objectIs(getSnapshot(), check)) return false;
          } catch (error) {
            return false;
          }
        }
      tag = node.child;
      if (node.subtreeFlags & 16384 && null !== tag)
        tag.return = node, node = tag;
      else {
        if (node === finishedWork) break;
        for (; null === node.sibling; ) {
          if (null === node.return || node.return === finishedWork) return true;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
    }
    return true;
  }
  function markRootSuspended(root2, suspendedLanes, spawnedLane, didAttemptEntireTree) {
    suspendedLanes &= ~workInProgressRootPingedLanes;
    suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
    root2.suspendedLanes |= suspendedLanes;
    root2.pingedLanes &= ~suspendedLanes;
    didAttemptEntireTree && (root2.warmLanes |= suspendedLanes);
    didAttemptEntireTree = root2.expirationTimes;
    for (var lanes = suspendedLanes; 0 < lanes; ) {
      var index$6 = 31 - clz32(lanes), lane = 1 << index$6;
      didAttemptEntireTree[index$6] = -1;
      lanes &= ~lane;
    }
    0 !== spawnedLane && markSpawnedDeferredLane(root2, spawnedLane, suspendedLanes);
  }
  function flushSyncWork$1() {
    return 0 === (executionContext & 6) ? (flushSyncWorkAcrossRoots_impl(0), false) : true;
  }
  function resetWorkInProgressStack() {
    if (null !== workInProgress) {
      if (0 === workInProgressSuspendedReason)
        var interruptedWork = workInProgress.return;
      else
        interruptedWork = workInProgress, lastContextDependency = currentlyRenderingFiber$1 = null, resetHooksOnUnwind(interruptedWork), thenableState$1 = null, thenableIndexCounter$1 = 0, interruptedWork = workInProgress;
      for (; null !== interruptedWork; )
        unwindInterruptedWork(interruptedWork.alternate, interruptedWork), interruptedWork = interruptedWork.return;
      workInProgress = null;
    }
  }
  function prepareFreshStack(root2, lanes) {
    var timeoutHandle = root2.timeoutHandle;
    -1 !== timeoutHandle && (root2.timeoutHandle = -1, cancelTimeout(timeoutHandle));
    timeoutHandle = root2.cancelPendingCommit;
    null !== timeoutHandle && (root2.cancelPendingCommit = null, timeoutHandle());
    pendingEffectsLanes = 0;
    resetWorkInProgressStack();
    workInProgressRoot = root2;
    workInProgress = timeoutHandle = createWorkInProgress(root2.current, null);
    workInProgressRootRenderLanes = lanes;
    workInProgressSuspendedReason = 0;
    workInProgressThrownValue = null;
    workInProgressRootDidSkipSuspendedSiblings = false;
    workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root2, lanes);
    workInProgressRootDidAttachPingListener = false;
    workInProgressSuspendedRetryLanes = workInProgressDeferredLane = workInProgressRootPingedLanes = workInProgressRootInterleavedUpdatedLanes = workInProgressRootSkippedLanes = workInProgressRootExitStatus = 0;
    workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors = null;
    workInProgressRootDidIncludeRecursiveRenderUpdate = false;
    0 !== (lanes & 8) && (lanes |= lanes & 32);
    var allEntangledLanes = root2.entangledLanes;
    if (0 !== allEntangledLanes)
      for (root2 = root2.entanglements, allEntangledLanes &= lanes; 0 < allEntangledLanes; ) {
        var index$4 = 31 - clz32(allEntangledLanes), lane = 1 << index$4;
        lanes |= root2[index$4];
        allEntangledLanes &= ~lane;
      }
    entangledRenderLanes = lanes;
    finishQueueingConcurrentUpdates();
    return timeoutHandle;
  }
  function handleThrow(root2, thrownValue) {
    currentlyRenderingFiber = null;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    thrownValue === SuspenseException || thrownValue === SuspenseActionException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 3) : thrownValue === SuspenseyCommitException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 4) : workInProgressSuspendedReason = thrownValue === SelectiveHydrationException ? 8 : null !== thrownValue && "object" === typeof thrownValue && "function" === typeof thrownValue.then ? 6 : 1;
    workInProgressThrownValue = thrownValue;
    null === workInProgress && (workInProgressRootExitStatus = 1, logUncaughtError(
      root2,
      createCapturedValueAtFiber(thrownValue, root2.current)
    ));
  }
  function shouldRemainOnPreviousScreen() {
    var handler = suspenseHandlerStackCursor.current;
    return null === handler ? true : (workInProgressRootRenderLanes & 4194048) === workInProgressRootRenderLanes ? null === shellBoundary ? true : false : (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes || 0 !== (workInProgressRootRenderLanes & 536870912) ? handler === shellBoundary : false;
  }
  function pushDispatcher() {
    var prevDispatcher = ReactSharedInternals.H;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
  }
  function pushAsyncDispatcher() {
    var prevAsyncDispatcher = ReactSharedInternals.A;
    ReactSharedInternals.A = DefaultAsyncDispatcher;
    return prevAsyncDispatcher;
  }
  function renderDidSuspendDelayIfPossible() {
    workInProgressRootExitStatus = 4;
    workInProgressRootDidSkipSuspendedSiblings || (workInProgressRootRenderLanes & 4194048) !== workInProgressRootRenderLanes && null !== suspenseHandlerStackCursor.current || (workInProgressRootIsPrerendering = true);
    0 === (workInProgressRootSkippedLanes & 134217727) && 0 === (workInProgressRootInterleavedUpdatedLanes & 134217727) || null === workInProgressRoot || markRootSuspended(
      workInProgressRoot,
      workInProgressRootRenderLanes,
      workInProgressDeferredLane,
      false
    );
  }
  function renderRootSync(root2, lanes, shouldYieldForPrerendering) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
    if (workInProgressRoot !== root2 || workInProgressRootRenderLanes !== lanes)
      workInProgressTransitions = null, prepareFreshStack(root2, lanes);
    lanes = false;
    var exitStatus = workInProgressRootExitStatus;
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
          var unitOfWork = workInProgress, thrownValue = workInProgressThrownValue;
          switch (workInProgressSuspendedReason) {
            case 8:
              resetWorkInProgressStack();
              exitStatus = 6;
              break a;
            case 3:
            case 2:
            case 9:
            case 6:
              null === suspenseHandlerStackCursor.current && (lanes = true);
              var reason = workInProgressSuspendedReason;
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, reason);
              if (shouldYieldForPrerendering && workInProgressRootIsPrerendering) {
                exitStatus = 0;
                break a;
              }
              break;
            default:
              reason = workInProgressSuspendedReason, workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, reason);
          }
        }
        workLoopSync();
        exitStatus = workInProgressRootExitStatus;
        break;
      } catch (thrownValue$165) {
        handleThrow(root2, thrownValue$165);
      }
    while (1);
    lanes && root2.shellSuspendCounter++;
    lastContextDependency = currentlyRenderingFiber$1 = null;
    executionContext = prevExecutionContext;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    null === workInProgress && (workInProgressRoot = null, workInProgressRootRenderLanes = 0, finishQueueingConcurrentUpdates());
    return exitStatus;
  }
  function workLoopSync() {
    for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
  }
  function renderRootConcurrent(root2, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
    workInProgressRoot !== root2 || workInProgressRootRenderLanes !== lanes ? (workInProgressTransitions = null, workInProgressRootRenderTargetTime = now() + 500, prepareFreshStack(root2, lanes)) : workInProgressRootIsPrerendering = checkIfRootIsPrerendering(
      root2,
      lanes
    );
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
          lanes = workInProgress;
          var thrownValue = workInProgressThrownValue;
          b: switch (workInProgressSuspendedReason) {
            case 1:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 1);
              break;
            case 2:
            case 9:
              if (isThenableResolved(thrownValue)) {
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                replaySuspendedUnitOfWork(lanes);
                break;
              }
              lanes = function() {
                2 !== workInProgressSuspendedReason && 9 !== workInProgressSuspendedReason || workInProgressRoot !== root2 || (workInProgressSuspendedReason = 7);
                ensureRootIsScheduled(root2);
              };
              thrownValue.then(lanes, lanes);
              break a;
            case 3:
              workInProgressSuspendedReason = 7;
              break a;
            case 4:
              workInProgressSuspendedReason = 5;
              break a;
            case 7:
              isThenableResolved(thrownValue) ? (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, replaySuspendedUnitOfWork(lanes)) : (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root2, lanes, thrownValue, 7));
              break;
            case 5:
              var resource = null;
              switch (workInProgress.tag) {
                case 26:
                  resource = workInProgress.memoizedState;
                case 5:
                case 27:
                  var hostFiber = workInProgress;
                  if (resource ? preloadResource(resource) : hostFiber.stateNode.complete) {
                    workInProgressSuspendedReason = 0;
                    workInProgressThrownValue = null;
                    var sibling = hostFiber.sibling;
                    if (null !== sibling) workInProgress = sibling;
                    else {
                      var returnFiber = hostFiber.return;
                      null !== returnFiber ? (workInProgress = returnFiber, completeUnitOfWork(returnFiber)) : workInProgress = null;
                    }
                    break b;
                  }
              }
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 5);
              break;
            case 6:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 6);
              break;
            case 8:
              resetWorkInProgressStack();
              workInProgressRootExitStatus = 6;
              break a;
            default:
              throw Error(formatProdErrorMessage(462));
          }
        }
        workLoopConcurrentByScheduler();
        break;
      } catch (thrownValue$167) {
        handleThrow(root2, thrownValue$167);
      }
    while (1);
    lastContextDependency = currentlyRenderingFiber$1 = null;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    executionContext = prevExecutionContext;
    if (null !== workInProgress) return 0;
    workInProgressRoot = null;
    workInProgressRootRenderLanes = 0;
    finishQueueingConcurrentUpdates();
    return workInProgressRootExitStatus;
  }
  function workLoopConcurrentByScheduler() {
    for (; null !== workInProgress && !shouldYield(); )
      performUnitOfWork(workInProgress);
  }
  function performUnitOfWork(unitOfWork) {
    var next = beginWork(unitOfWork.alternate, unitOfWork, entangledRenderLanes);
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
  }
  function replaySuspendedUnitOfWork(unitOfWork) {
    var next = unitOfWork;
    var current = next.alternate;
    switch (next.tag) {
      case 15:
      case 0:
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type,
          void 0,
          workInProgressRootRenderLanes
        );
        break;
      case 11:
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type.render,
          next.ref,
          workInProgressRootRenderLanes
        );
        break;
      case 5:
        resetHooksOnUnwind(next);
      default:
        unwindInterruptedWork(current, next), next = workInProgress = resetWorkInProgress(next, entangledRenderLanes), next = beginWork(current, next, entangledRenderLanes);
    }
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
  }
  function throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, suspendedReason) {
    lastContextDependency = currentlyRenderingFiber$1 = null;
    resetHooksOnUnwind(unitOfWork);
    thenableState$1 = null;
    thenableIndexCounter$1 = 0;
    var returnFiber = unitOfWork.return;
    try {
      if (throwException(
        root2,
        returnFiber,
        unitOfWork,
        thrownValue,
        workInProgressRootRenderLanes
      )) {
        workInProgressRootExitStatus = 1;
        logUncaughtError(
          root2,
          createCapturedValueAtFiber(thrownValue, root2.current)
        );
        workInProgress = null;
        return;
      }
    } catch (error) {
      if (null !== returnFiber) throw workInProgress = returnFiber, error;
      workInProgressRootExitStatus = 1;
      logUncaughtError(
        root2,
        createCapturedValueAtFiber(thrownValue, root2.current)
      );
      workInProgress = null;
      return;
    }
    if (unitOfWork.flags & 32768) {
      if (isHydrating || 1 === suspendedReason) root2 = true;
      else if (workInProgressRootIsPrerendering || 0 !== (workInProgressRootRenderLanes & 536870912))
        root2 = false;
      else if (workInProgressRootDidSkipSuspendedSiblings = root2 = true, 2 === suspendedReason || 9 === suspendedReason || 3 === suspendedReason || 6 === suspendedReason)
        suspendedReason = suspenseHandlerStackCursor.current, null !== suspendedReason && 13 === suspendedReason.tag && (suspendedReason.flags |= 16384);
      unwindUnitOfWork(unitOfWork, root2);
    } else completeUnitOfWork(unitOfWork);
  }
  function completeUnitOfWork(unitOfWork) {
    var completedWork = unitOfWork;
    do {
      if (0 !== (completedWork.flags & 32768)) {
        unwindUnitOfWork(
          completedWork,
          workInProgressRootDidSkipSuspendedSiblings
        );
        return;
      }
      unitOfWork = completedWork.return;
      var next = completeWork(
        completedWork.alternate,
        completedWork,
        entangledRenderLanes
      );
      if (null !== next) {
        workInProgress = next;
        return;
      }
      completedWork = completedWork.sibling;
      if (null !== completedWork) {
        workInProgress = completedWork;
        return;
      }
      workInProgress = completedWork = unitOfWork;
    } while (null !== completedWork);
    0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
  }
  function unwindUnitOfWork(unitOfWork, skipSiblings) {
    do {
      var next = unwindWork(unitOfWork.alternate, unitOfWork);
      if (null !== next) {
        next.flags &= 32767;
        workInProgress = next;
        return;
      }
      next = unitOfWork.return;
      null !== next && (next.flags |= 32768, next.subtreeFlags = 0, next.deletions = null);
      if (!skipSiblings && (unitOfWork = unitOfWork.sibling, null !== unitOfWork)) {
        workInProgress = unitOfWork;
        return;
      }
      workInProgress = unitOfWork = next;
    } while (null !== unitOfWork);
    workInProgressRootExitStatus = 6;
    workInProgress = null;
  }
  function commitRoot(root2, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes) {
    root2.cancelPendingCommit = null;
    do
      flushPendingEffects();
    while (0 !== pendingEffectsStatus);
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    if (null !== finishedWork) {
      if (finishedWork === root2.current) throw Error(formatProdErrorMessage(177));
      didIncludeRenderPhaseUpdate = finishedWork.lanes | finishedWork.childLanes;
      didIncludeRenderPhaseUpdate |= concurrentlyUpdatedLanes;
      markRootFinished(
        root2,
        lanes,
        didIncludeRenderPhaseUpdate,
        spawnedLane,
        updatedLanes,
        suspendedRetryLanes
      );
      root2 === workInProgressRoot && (workInProgress = workInProgressRoot = null, workInProgressRootRenderLanes = 0);
      pendingFinishedWork = finishedWork;
      pendingEffectsRoot = root2;
      pendingEffectsLanes = lanes;
      pendingEffectsRemainingLanes = didIncludeRenderPhaseUpdate;
      pendingPassiveTransitions = transitions;
      pendingRecoverableErrors = recoverableErrors;
      0 !== (finishedWork.subtreeFlags & 10256) || 0 !== (finishedWork.flags & 10256) ? (root2.callbackNode = null, root2.callbackPriority = 0, scheduleCallback$1(NormalPriority$1, function() {
        flushPassiveEffects();
        return null;
      })) : (root2.callbackNode = null, root2.callbackPriority = 0);
      recoverableErrors = 0 !== (finishedWork.flags & 13878);
      if (0 !== (finishedWork.subtreeFlags & 13878) || recoverableErrors) {
        recoverableErrors = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        transitions = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        spawnedLane = executionContext;
        executionContext |= 4;
        try {
          commitBeforeMutationEffects(root2, finishedWork, lanes);
        } finally {
          executionContext = spawnedLane, ReactDOMSharedInternals.p = transitions, ReactSharedInternals.T = recoverableErrors;
        }
      }
      pendingEffectsStatus = 1;
      flushMutationEffects();
      flushLayoutEffects();
      flushSpawnedWork();
    }
  }
  function flushMutationEffects() {
    if (1 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, rootMutationHasEffect = 0 !== (finishedWork.flags & 13878);
      if (0 !== (finishedWork.subtreeFlags & 13878) || rootMutationHasEffect) {
        rootMutationHasEffect = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        var previousPriority = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        try {
          commitMutationEffectsOnFiber(finishedWork, root2);
          var priorSelectionInformation = selectionInformation, curFocusedElem = getActiveElementDeep(root2.containerInfo), priorFocusedElem = priorSelectionInformation.focusedElem, priorSelectionRange = priorSelectionInformation.selectionRange;
          if (curFocusedElem !== priorFocusedElem && priorFocusedElem && priorFocusedElem.ownerDocument && containsNode(
            priorFocusedElem.ownerDocument.documentElement,
            priorFocusedElem
          )) {
            if (null !== priorSelectionRange && hasSelectionCapabilities(priorFocusedElem)) {
              var start = priorSelectionRange.start, end = priorSelectionRange.end;
              void 0 === end && (end = start);
              if ("selectionStart" in priorFocusedElem)
                priorFocusedElem.selectionStart = start, priorFocusedElem.selectionEnd = Math.min(
                  end,
                  priorFocusedElem.value.length
                );
              else {
                var doc = priorFocusedElem.ownerDocument || document, win = doc && doc.defaultView || window;
                if (win.getSelection) {
                  var selection = win.getSelection(), length = priorFocusedElem.textContent.length, start$jscomp$0 = Math.min(priorSelectionRange.start, length), end$jscomp$0 = void 0 === priorSelectionRange.end ? start$jscomp$0 : Math.min(priorSelectionRange.end, length);
                  !selection.extend && start$jscomp$0 > end$jscomp$0 && (curFocusedElem = end$jscomp$0, end$jscomp$0 = start$jscomp$0, start$jscomp$0 = curFocusedElem);
                  var startMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    start$jscomp$0
                  ), endMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    end$jscomp$0
                  );
                  if (startMarker && endMarker && (1 !== selection.rangeCount || selection.anchorNode !== startMarker.node || selection.anchorOffset !== startMarker.offset || selection.focusNode !== endMarker.node || selection.focusOffset !== endMarker.offset)) {
                    var range = doc.createRange();
                    range.setStart(startMarker.node, startMarker.offset);
                    selection.removeAllRanges();
                    start$jscomp$0 > end$jscomp$0 ? (selection.addRange(range), selection.extend(endMarker.node, endMarker.offset)) : (range.setEnd(endMarker.node, endMarker.offset), selection.addRange(range));
                  }
                }
              }
            }
            doc = [];
            for (selection = priorFocusedElem; selection = selection.parentNode; )
              1 === selection.nodeType && doc.push({
                element: selection,
                left: selection.scrollLeft,
                top: selection.scrollTop
              });
            "function" === typeof priorFocusedElem.focus && priorFocusedElem.focus();
            for (priorFocusedElem = 0; priorFocusedElem < doc.length; priorFocusedElem++) {
              var info = doc[priorFocusedElem];
              info.element.scrollLeft = info.left;
              info.element.scrollTop = info.top;
            }
          }
          _enabled = !!eventsEnabled;
          selectionInformation = eventsEnabled = null;
        } finally {
          executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootMutationHasEffect;
        }
      }
      root2.current = finishedWork;
      pendingEffectsStatus = 2;
    }
  }
  function flushLayoutEffects() {
    if (2 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, rootHasLayoutEffect = 0 !== (finishedWork.flags & 8772);
      if (0 !== (finishedWork.subtreeFlags & 8772) || rootHasLayoutEffect) {
        rootHasLayoutEffect = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        var previousPriority = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        try {
          commitLayoutEffectOnFiber(root2, finishedWork.alternate, finishedWork);
        } finally {
          executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootHasLayoutEffect;
        }
      }
      pendingEffectsStatus = 3;
    }
  }
  function flushSpawnedWork() {
    if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      requestPaint();
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, recoverableErrors = pendingRecoverableErrors;
      0 !== (finishedWork.subtreeFlags & 10256) || 0 !== (finishedWork.flags & 10256) ? pendingEffectsStatus = 5 : (pendingEffectsStatus = 0, pendingFinishedWork = pendingEffectsRoot = null, releaseRootPooledCache(root2, root2.pendingLanes));
      var remainingLanes = root2.pendingLanes;
      0 === remainingLanes && (legacyErrorBoundariesThatAlreadyFailed = null);
      lanesToEventPriority(lanes);
      finishedWork = finishedWork.stateNode;
      if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
        try {
          injectedHook.onCommitFiberRoot(
            rendererID,
            finishedWork,
            void 0,
            128 === (finishedWork.current.flags & 128)
          );
        } catch (err) {
        }
      if (null !== recoverableErrors) {
        finishedWork = ReactSharedInternals.T;
        remainingLanes = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        ReactSharedInternals.T = null;
        try {
          for (var onRecoverableError = root2.onRecoverableError, i = 0; i < recoverableErrors.length; i++) {
            var recoverableError = recoverableErrors[i];
            onRecoverableError(recoverableError.value, {
              componentStack: recoverableError.stack
            });
          }
        } finally {
          ReactSharedInternals.T = finishedWork, ReactDOMSharedInternals.p = remainingLanes;
        }
      }
      0 !== (pendingEffectsLanes & 3) && flushPendingEffects();
      ensureRootIsScheduled(root2);
      remainingLanes = root2.pendingLanes;
      0 !== (lanes & 261930) && 0 !== (remainingLanes & 42) ? root2 === rootWithNestedUpdates ? nestedUpdateCount++ : (nestedUpdateCount = 0, rootWithNestedUpdates = root2) : nestedUpdateCount = 0;
      flushSyncWorkAcrossRoots_impl(0);
    }
  }
  function releaseRootPooledCache(root2, remainingLanes) {
    0 === (root2.pooledCacheLanes &= remainingLanes) && (remainingLanes = root2.pooledCache, null != remainingLanes && (root2.pooledCache = null, releaseCache(remainingLanes)));
  }
  function flushPendingEffects() {
    flushMutationEffects();
    flushLayoutEffects();
    flushSpawnedWork();
    return flushPassiveEffects();
  }
  function flushPassiveEffects() {
    if (5 !== pendingEffectsStatus) return false;
    var root2 = pendingEffectsRoot, remainingLanes = pendingEffectsRemainingLanes;
    pendingEffectsRemainingLanes = 0;
    var renderPriority = lanesToEventPriority(pendingEffectsLanes), prevTransition = ReactSharedInternals.T, previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 32 > renderPriority ? 32 : renderPriority;
      ReactSharedInternals.T = null;
      renderPriority = pendingPassiveTransitions;
      pendingPassiveTransitions = null;
      var root$jscomp$0 = pendingEffectsRoot, lanes = pendingEffectsLanes;
      pendingEffectsStatus = 0;
      pendingFinishedWork = pendingEffectsRoot = null;
      pendingEffectsLanes = 0;
      if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(331));
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      commitPassiveUnmountOnFiber(root$jscomp$0.current);
      commitPassiveMountOnFiber(
        root$jscomp$0,
        root$jscomp$0.current,
        lanes,
        renderPriority
      );
      executionContext = prevExecutionContext;
      flushSyncWorkAcrossRoots_impl(0, false);
      if (injectedHook && "function" === typeof injectedHook.onPostCommitFiberRoot)
        try {
          injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
        } catch (err) {
        }
      return true;
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition, releaseRootPooledCache(root2, remainingLanes);
    }
  }
  function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
    sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
    rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
    null !== rootFiber && (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
  }
  function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
    if (3 === sourceFiber.tag)
      captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
    else
      for (; null !== nearestMountedAncestor; ) {
        if (3 === nearestMountedAncestor.tag) {
          captureCommitPhaseErrorOnRoot(
            nearestMountedAncestor,
            sourceFiber,
            error
          );
          break;
        } else if (1 === nearestMountedAncestor.tag) {
          var instance = nearestMountedAncestor.stateNode;
          if ("function" === typeof nearestMountedAncestor.type.getDerivedStateFromError || "function" === typeof instance.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(instance))) {
            sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
            error = createClassErrorUpdate(2);
            instance = enqueueUpdate(nearestMountedAncestor, error, 2);
            null !== instance && (initializeClassErrorUpdate(
              error,
              instance,
              nearestMountedAncestor,
              sourceFiber
            ), markRootUpdated$1(instance, 2), ensureRootIsScheduled(instance));
            break;
          }
        }
        nearestMountedAncestor = nearestMountedAncestor.return;
      }
  }
  function attachPingListener(root2, wakeable, lanes) {
    var pingCache = root2.pingCache;
    if (null === pingCache) {
      pingCache = root2.pingCache = new PossiblyWeakMap();
      var threadIDs = /* @__PURE__ */ new Set();
      pingCache.set(wakeable, threadIDs);
    } else
      threadIDs = pingCache.get(wakeable), void 0 === threadIDs && (threadIDs = /* @__PURE__ */ new Set(), pingCache.set(wakeable, threadIDs));
    threadIDs.has(lanes) || (workInProgressRootDidAttachPingListener = true, threadIDs.add(lanes), root2 = pingSuspendedRoot.bind(null, root2, wakeable, lanes), wakeable.then(root2, root2));
  }
  function pingSuspendedRoot(root2, wakeable, pingedLanes) {
    var pingCache = root2.pingCache;
    null !== pingCache && pingCache.delete(wakeable);
    root2.pingedLanes |= root2.suspendedLanes & pingedLanes;
    root2.warmLanes &= ~pingedLanes;
    workInProgressRoot === root2 && (workInProgressRootRenderLanes & pingedLanes) === pingedLanes && (4 === workInProgressRootExitStatus || 3 === workInProgressRootExitStatus && (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes && 300 > now() - globalMostRecentFallbackTime ? 0 === (executionContext & 2) && prepareFreshStack(root2, 0) : workInProgressRootPingedLanes |= pingedLanes, workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes && (workInProgressSuspendedRetryLanes = 0));
    ensureRootIsScheduled(root2);
  }
  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    0 === retryLane && (retryLane = claimNextRetryLane());
    boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
    null !== boundaryFiber && (markRootUpdated$1(boundaryFiber, retryLane), ensureRootIsScheduled(boundaryFiber));
  }
  function retryDehydratedSuspenseBoundary(boundaryFiber) {
    var suspenseState = boundaryFiber.memoizedState, retryLane = 0;
    null !== suspenseState && (retryLane = suspenseState.retryLane);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function resolveRetryWakeable(boundaryFiber, wakeable) {
    var retryLane = 0;
    switch (boundaryFiber.tag) {
      case 31:
      case 13:
        var retryCache = boundaryFiber.stateNode;
        var suspenseState = boundaryFiber.memoizedState;
        null !== suspenseState && (retryLane = suspenseState.retryLane);
        break;
      case 19:
        retryCache = boundaryFiber.stateNode;
        break;
      case 22:
        retryCache = boundaryFiber.stateNode._retryCache;
        break;
      default:
        throw Error(formatProdErrorMessage(314));
    }
    null !== retryCache && retryCache.delete(wakeable);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function scheduleCallback$1(priorityLevel, callback) {
    return scheduleCallback$3(priorityLevel, callback);
  }
  var firstScheduledRoot = null, lastScheduledRoot = null, didScheduleMicrotask = false, mightHavePendingSyncWork = false, isFlushingWork = false, currentEventTransitionLane = 0;
  function ensureRootIsScheduled(root2) {
    root2 !== lastScheduledRoot && null === root2.next && (null === lastScheduledRoot ? firstScheduledRoot = lastScheduledRoot = root2 : lastScheduledRoot = lastScheduledRoot.next = root2);
    mightHavePendingSyncWork = true;
    didScheduleMicrotask || (didScheduleMicrotask = true, scheduleImmediateRootScheduleTask());
  }
  function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
    if (!isFlushingWork && mightHavePendingSyncWork) {
      isFlushingWork = true;
      do {
        var didPerformSomeWork = false;
        for (var root$170 = firstScheduledRoot; null !== root$170; ) {
          if (0 !== syncTransitionLanes) {
            var pendingLanes = root$170.pendingLanes;
            if (0 === pendingLanes) var JSCompiler_inline_result = 0;
            else {
              var suspendedLanes = root$170.suspendedLanes, pingedLanes = root$170.pingedLanes;
              JSCompiler_inline_result = (1 << 31 - clz32(42 | syncTransitionLanes) + 1) - 1;
              JSCompiler_inline_result &= pendingLanes & ~(suspendedLanes & ~pingedLanes);
              JSCompiler_inline_result = JSCompiler_inline_result & 201326741 ? JSCompiler_inline_result & 201326741 | 1 : JSCompiler_inline_result ? JSCompiler_inline_result | 2 : 0;
            }
            0 !== JSCompiler_inline_result && (didPerformSomeWork = true, performSyncWorkOnRoot(root$170, JSCompiler_inline_result));
          } else
            JSCompiler_inline_result = workInProgressRootRenderLanes, JSCompiler_inline_result = getNextLanes(
              root$170,
              root$170 === workInProgressRoot ? JSCompiler_inline_result : 0,
              null !== root$170.cancelPendingCommit || -1 !== root$170.timeoutHandle
            ), 0 === (JSCompiler_inline_result & 3) || checkIfRootIsPrerendering(root$170, JSCompiler_inline_result) || (didPerformSomeWork = true, performSyncWorkOnRoot(root$170, JSCompiler_inline_result));
          root$170 = root$170.next;
        }
      } while (didPerformSomeWork);
      isFlushingWork = false;
    }
  }
  function processRootScheduleInImmediateTask() {
    processRootScheduleInMicrotask();
  }
  function processRootScheduleInMicrotask() {
    mightHavePendingSyncWork = didScheduleMicrotask = false;
    var syncTransitionLanes = 0;
    0 !== currentEventTransitionLane && shouldAttemptEagerTransition() && (syncTransitionLanes = currentEventTransitionLane);
    for (var currentTime = now(), prev = null, root2 = firstScheduledRoot; null !== root2; ) {
      var next = root2.next, nextLanes = scheduleTaskForRootDuringMicrotask(root2, currentTime);
      if (0 === nextLanes)
        root2.next = null, null === prev ? firstScheduledRoot = next : prev.next = next, null === next && (lastScheduledRoot = prev);
      else if (prev = root2, 0 !== syncTransitionLanes || 0 !== (nextLanes & 3))
        mightHavePendingSyncWork = true;
      root2 = next;
    }
    0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus || flushSyncWorkAcrossRoots_impl(syncTransitionLanes);
    0 !== currentEventTransitionLane && (currentEventTransitionLane = 0);
  }
  function scheduleTaskForRootDuringMicrotask(root2, currentTime) {
    for (var suspendedLanes = root2.suspendedLanes, pingedLanes = root2.pingedLanes, expirationTimes = root2.expirationTimes, lanes = root2.pendingLanes & -62914561; 0 < lanes; ) {
      var index$5 = 31 - clz32(lanes), lane = 1 << index$5, expirationTime = expirationTimes[index$5];
      if (-1 === expirationTime) {
        if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
          expirationTimes[index$5] = computeExpirationTime(lane, currentTime);
      } else expirationTime <= currentTime && (root2.expiredLanes |= lane);
      lanes &= ~lane;
    }
    currentTime = workInProgressRoot;
    suspendedLanes = workInProgressRootRenderLanes;
    suspendedLanes = getNextLanes(
      root2,
      root2 === currentTime ? suspendedLanes : 0,
      null !== root2.cancelPendingCommit || -1 !== root2.timeoutHandle
    );
    pingedLanes = root2.callbackNode;
    if (0 === suspendedLanes || root2 === currentTime && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root2.cancelPendingCommit)
      return null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes), root2.callbackNode = null, root2.callbackPriority = 0;
    if (0 === (suspendedLanes & 3) || checkIfRootIsPrerendering(root2, suspendedLanes)) {
      currentTime = suspendedLanes & -suspendedLanes;
      if (currentTime === root2.callbackPriority) return currentTime;
      null !== pingedLanes && cancelCallback$1(pingedLanes);
      switch (lanesToEventPriority(suspendedLanes)) {
        case 2:
        case 8:
          suspendedLanes = UserBlockingPriority;
          break;
        case 32:
          suspendedLanes = NormalPriority$1;
          break;
        case 268435456:
          suspendedLanes = IdlePriority;
          break;
        default:
          suspendedLanes = NormalPriority$1;
      }
      pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root2);
      suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
      root2.callbackPriority = currentTime;
      root2.callbackNode = suspendedLanes;
      return currentTime;
    }
    null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes);
    root2.callbackPriority = 2;
    root2.callbackNode = null;
    return 2;
  }
  function performWorkOnRootViaSchedulerTask(root2, didTimeout) {
    if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
      return root2.callbackNode = null, root2.callbackPriority = 0, null;
    var originalCallbackNode = root2.callbackNode;
    if (flushPendingEffects() && root2.callbackNode !== originalCallbackNode)
      return null;
    var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
    workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
      root2,
      root2 === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
      null !== root2.cancelPendingCommit || -1 !== root2.timeoutHandle
    );
    if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
    performWorkOnRoot(root2, workInProgressRootRenderLanes$jscomp$0, didTimeout);
    scheduleTaskForRootDuringMicrotask(root2, now());
    return null != root2.callbackNode && root2.callbackNode === originalCallbackNode ? performWorkOnRootViaSchedulerTask.bind(null, root2) : null;
  }
  function performSyncWorkOnRoot(root2, lanes) {
    if (flushPendingEffects()) return null;
    performWorkOnRoot(root2, lanes, true);
  }
  function scheduleImmediateRootScheduleTask() {
    scheduleMicrotask(function() {
      0 !== (executionContext & 6) ? scheduleCallback$3(
        ImmediatePriority,
        processRootScheduleInImmediateTask
      ) : processRootScheduleInMicrotask();
    });
  }
  function requestTransitionLane() {
    if (0 === currentEventTransitionLane) {
      var actionScopeLane = currentEntangledLane;
      0 === actionScopeLane && (actionScopeLane = nextTransitionUpdateLane, nextTransitionUpdateLane <<= 1, 0 === (nextTransitionUpdateLane & 261888) && (nextTransitionUpdateLane = 256));
      currentEventTransitionLane = actionScopeLane;
    }
    return currentEventTransitionLane;
  }
  function coerceFormActionProp(actionProp) {
    return null == actionProp || "symbol" === typeof actionProp || "boolean" === typeof actionProp ? null : "function" === typeof actionProp ? actionProp : sanitizeURL("" + actionProp);
  }
  function createFormDataWithSubmitter(form, submitter) {
    var temp = submitter.ownerDocument.createElement("input");
    temp.name = submitter.name;
    temp.value = submitter.value;
    form.id && temp.setAttribute("form", form.id);
    submitter.parentNode.insertBefore(temp, submitter);
    form = new FormData(form);
    temp.parentNode.removeChild(temp);
    return form;
  }
  function extractEvents$1(dispatchQueue, domEventName, maybeTargetInst, nativeEvent, nativeEventTarget) {
    if ("submit" === domEventName && maybeTargetInst && maybeTargetInst.stateNode === nativeEventTarget) {
      var action = coerceFormActionProp(
        (nativeEventTarget[internalPropsKey] || null).action
      ), submitter = nativeEvent.submitter;
      submitter && (domEventName = (domEventName = submitter[internalPropsKey] || null) ? coerceFormActionProp(domEventName.formAction) : submitter.getAttribute("formAction"), null !== domEventName && (action = domEventName, submitter = null));
      var event = new SyntheticEvent(
        "action",
        "action",
        null,
        nativeEvent,
        nativeEventTarget
      );
      dispatchQueue.push({
        event,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (nativeEvent.defaultPrevented) {
                if (0 !== currentEventTransitionLane) {
                  var formData = submitter ? createFormDataWithSubmitter(nativeEventTarget, submitter) : new FormData(nativeEventTarget);
                  startHostTransition(
                    maybeTargetInst,
                    {
                      pending: true,
                      data: formData,
                      method: nativeEventTarget.method,
                      action
                    },
                    null,
                    formData
                  );
                }
              } else
                "function" === typeof action && (event.preventDefault(), formData = submitter ? createFormDataWithSubmitter(nativeEventTarget, submitter) : new FormData(nativeEventTarget), startHostTransition(
                  maybeTargetInst,
                  {
                    pending: true,
                    data: formData,
                    method: nativeEventTarget.method,
                    action
                  },
                  action,
                  formData
                ));
            },
            currentTarget: nativeEventTarget
          }
        ]
      });
    }
  }
  for (var i$jscomp$inline_1577 = 0; i$jscomp$inline_1577 < simpleEventPluginEvents.length; i$jscomp$inline_1577++) {
    var eventName$jscomp$inline_1578 = simpleEventPluginEvents[i$jscomp$inline_1577], domEventName$jscomp$inline_1579 = eventName$jscomp$inline_1578.toLowerCase(), capitalizedEvent$jscomp$inline_1580 = eventName$jscomp$inline_1578[0].toUpperCase() + eventName$jscomp$inline_1578.slice(1);
    registerSimpleEvent(
      domEventName$jscomp$inline_1579,
      "on" + capitalizedEvent$jscomp$inline_1580
    );
  }
  registerSimpleEvent(ANIMATION_END, "onAnimationEnd");
  registerSimpleEvent(ANIMATION_ITERATION, "onAnimationIteration");
  registerSimpleEvent(ANIMATION_START, "onAnimationStart");
  registerSimpleEvent("dblclick", "onDoubleClick");
  registerSimpleEvent("focusin", "onFocus");
  registerSimpleEvent("focusout", "onBlur");
  registerSimpleEvent(TRANSITION_RUN, "onTransitionRun");
  registerSimpleEvent(TRANSITION_START, "onTransitionStart");
  registerSimpleEvent(TRANSITION_CANCEL, "onTransitionCancel");
  registerSimpleEvent(TRANSITION_END, "onTransitionEnd");
  registerDirectEvent("onMouseEnter", ["mouseout", "mouseover"]);
  registerDirectEvent("onMouseLeave", ["mouseout", "mouseover"]);
  registerDirectEvent("onPointerEnter", ["pointerout", "pointerover"]);
  registerDirectEvent("onPointerLeave", ["pointerout", "pointerover"]);
  registerTwoPhaseEvent(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  );
  registerTwoPhaseEvent(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  );
  registerTwoPhaseEvent("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]);
  registerTwoPhaseEvent(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var mediaEventTypes = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), nonDelegatedEvents = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(mediaEventTypes)
  );
  function processDispatchQueue(dispatchQueue, eventSystemFlags) {
    eventSystemFlags = 0 !== (eventSystemFlags & 4);
    for (var i = 0; i < dispatchQueue.length; i++) {
      var _dispatchQueue$i = dispatchQueue[i], event = _dispatchQueue$i.event;
      _dispatchQueue$i = _dispatchQueue$i.listeners;
      a: {
        var previousInstance = void 0;
        if (eventSystemFlags)
          for (var i$jscomp$0 = _dispatchQueue$i.length - 1; 0 <= i$jscomp$0; i$jscomp$0--) {
            var _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0], instance = _dispatchListeners$i.instance, currentTarget = _dispatchListeners$i.currentTarget;
            _dispatchListeners$i = _dispatchListeners$i.listener;
            if (instance !== previousInstance && event.isPropagationStopped())
              break a;
            previousInstance = _dispatchListeners$i;
            event.currentTarget = currentTarget;
            try {
              previousInstance(event);
            } catch (error) {
              reportGlobalError(error);
            }
            event.currentTarget = null;
            previousInstance = instance;
          }
        else
          for (i$jscomp$0 = 0; i$jscomp$0 < _dispatchQueue$i.length; i$jscomp$0++) {
            _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0];
            instance = _dispatchListeners$i.instance;
            currentTarget = _dispatchListeners$i.currentTarget;
            _dispatchListeners$i = _dispatchListeners$i.listener;
            if (instance !== previousInstance && event.isPropagationStopped())
              break a;
            previousInstance = _dispatchListeners$i;
            event.currentTarget = currentTarget;
            try {
              previousInstance(event);
            } catch (error) {
              reportGlobalError(error);
            }
            event.currentTarget = null;
            previousInstance = instance;
          }
      }
    }
  }
  function listenToNonDelegatedEvent(domEventName, targetElement) {
    var JSCompiler_inline_result = targetElement[internalEventHandlersKey];
    void 0 === JSCompiler_inline_result && (JSCompiler_inline_result = targetElement[internalEventHandlersKey] = /* @__PURE__ */ new Set());
    var listenerSetKey = domEventName + "__bubble";
    JSCompiler_inline_result.has(listenerSetKey) || (addTrappedEventListener(targetElement, domEventName, 2, false), JSCompiler_inline_result.add(listenerSetKey));
  }
  function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
    var eventSystemFlags = 0;
    isCapturePhaseListener && (eventSystemFlags |= 4);
    addTrappedEventListener(
      target,
      domEventName,
      eventSystemFlags,
      isCapturePhaseListener
    );
  }
  var listeningMarker = "_reactListening" + Math.random().toString(36).slice(2);
  function listenToAllSupportedEvents(rootContainerElement) {
    if (!rootContainerElement[listeningMarker]) {
      rootContainerElement[listeningMarker] = true;
      allNativeEvents.forEach(function(domEventName) {
        "selectionchange" !== domEventName && (nonDelegatedEvents.has(domEventName) || listenToNativeEvent(domEventName, false, rootContainerElement), listenToNativeEvent(domEventName, true, rootContainerElement));
      });
      var ownerDocument = 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
      null === ownerDocument || ownerDocument[listeningMarker] || (ownerDocument[listeningMarker] = true, listenToNativeEvent("selectionchange", false, ownerDocument));
    }
  }
  function addTrappedEventListener(targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener) {
    switch (getEventPriority(domEventName)) {
      case 2:
        var listenerWrapper = dispatchDiscreteEvent;
        break;
      case 8:
        listenerWrapper = dispatchContinuousEvent;
        break;
      default:
        listenerWrapper = dispatchEvent;
    }
    eventSystemFlags = listenerWrapper.bind(
      null,
      domEventName,
      eventSystemFlags,
      targetContainer
    );
    listenerWrapper = void 0;
    !passiveBrowserEventsSupported || "touchstart" !== domEventName && "touchmove" !== domEventName && "wheel" !== domEventName || (listenerWrapper = true);
    isCapturePhaseListener ? void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
      capture: true,
      passive: listenerWrapper
    }) : targetContainer.addEventListener(domEventName, eventSystemFlags, true) : void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
      passive: listenerWrapper
    }) : targetContainer.addEventListener(domEventName, eventSystemFlags, false);
  }
  function dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, targetInst$jscomp$0, targetContainer) {
    var ancestorInst = targetInst$jscomp$0;
    if (0 === (eventSystemFlags & 1) && 0 === (eventSystemFlags & 2) && null !== targetInst$jscomp$0)
      a: for (; ; ) {
        if (null === targetInst$jscomp$0) return;
        var nodeTag = targetInst$jscomp$0.tag;
        if (3 === nodeTag || 4 === nodeTag) {
          var container = targetInst$jscomp$0.stateNode.containerInfo;
          if (container === targetContainer) break;
          if (4 === nodeTag)
            for (nodeTag = targetInst$jscomp$0.return; null !== nodeTag; ) {
              var grandTag = nodeTag.tag;
              if ((3 === grandTag || 4 === grandTag) && nodeTag.stateNode.containerInfo === targetContainer)
                return;
              nodeTag = nodeTag.return;
            }
          for (; null !== container; ) {
            nodeTag = getClosestInstanceFromNode(container);
            if (null === nodeTag) return;
            grandTag = nodeTag.tag;
            if (5 === grandTag || 6 === grandTag || 26 === grandTag || 27 === grandTag) {
              targetInst$jscomp$0 = ancestorInst = nodeTag;
              continue a;
            }
            container = container.parentNode;
          }
        }
        targetInst$jscomp$0 = targetInst$jscomp$0.return;
      }
    batchedUpdates$1(function() {
      var targetInst = ancestorInst, nativeEventTarget = getEventTarget(nativeEvent), dispatchQueue = [];
      a: {
        var reactName = topLevelEventsToReactNames.get(domEventName);
        if (void 0 !== reactName) {
          var SyntheticEventCtor = SyntheticEvent, reactEventType = domEventName;
          switch (domEventName) {
            case "keypress":
              if (0 === getEventCharCode(nativeEvent)) break a;
            case "keydown":
            case "keyup":
              SyntheticEventCtor = SyntheticKeyboardEvent;
              break;
            case "focusin":
              reactEventType = "focus";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "focusout":
              reactEventType = "blur";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "beforeblur":
            case "afterblur":
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "click":
              if (2 === nativeEvent.button) break a;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              SyntheticEventCtor = SyntheticMouseEvent;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              SyntheticEventCtor = SyntheticDragEvent;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              SyntheticEventCtor = SyntheticTouchEvent;
              break;
            case ANIMATION_END:
            case ANIMATION_ITERATION:
            case ANIMATION_START:
              SyntheticEventCtor = SyntheticAnimationEvent;
              break;
            case TRANSITION_END:
              SyntheticEventCtor = SyntheticTransitionEvent;
              break;
            case "scroll":
            case "scrollend":
              SyntheticEventCtor = SyntheticUIEvent;
              break;
            case "wheel":
              SyntheticEventCtor = SyntheticWheelEvent;
              break;
            case "copy":
            case "cut":
            case "paste":
              SyntheticEventCtor = SyntheticClipboardEvent;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              SyntheticEventCtor = SyntheticPointerEvent;
              break;
            case "toggle":
            case "beforetoggle":
              SyntheticEventCtor = SyntheticToggleEvent;
          }
          var inCapturePhase = 0 !== (eventSystemFlags & 4), accumulateTargetOnly = !inCapturePhase && ("scroll" === domEventName || "scrollend" === domEventName), reactEventName = inCapturePhase ? null !== reactName ? reactName + "Capture" : null : reactName;
          inCapturePhase = [];
          for (var instance = targetInst, lastHostComponent; null !== instance; ) {
            var _instance = instance;
            lastHostComponent = _instance.stateNode;
            _instance = _instance.tag;
            5 !== _instance && 26 !== _instance && 27 !== _instance || null === lastHostComponent || null === reactEventName || (_instance = getListener(instance, reactEventName), null != _instance && inCapturePhase.push(
              createDispatchListener(instance, _instance, lastHostComponent)
            ));
            if (accumulateTargetOnly) break;
            instance = instance.return;
          }
          0 < inCapturePhase.length && (reactName = new SyntheticEventCtor(
            reactName,
            reactEventType,
            null,
            nativeEvent,
            nativeEventTarget
          ), dispatchQueue.push({ event: reactName, listeners: inCapturePhase }));
        }
      }
      if (0 === (eventSystemFlags & 7)) {
        a: {
          reactName = "mouseover" === domEventName || "pointerover" === domEventName;
          SyntheticEventCtor = "mouseout" === domEventName || "pointerout" === domEventName;
          if (reactName && nativeEvent !== currentReplayingEvent && (reactEventType = nativeEvent.relatedTarget || nativeEvent.fromElement) && (getClosestInstanceFromNode(reactEventType) || reactEventType[internalContainerInstanceKey]))
            break a;
          if (SyntheticEventCtor || reactName) {
            reactName = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget : (reactName = nativeEventTarget.ownerDocument) ? reactName.defaultView || reactName.parentWindow : window;
            if (SyntheticEventCtor) {
              if (reactEventType = nativeEvent.relatedTarget || nativeEvent.toElement, SyntheticEventCtor = targetInst, reactEventType = reactEventType ? getClosestInstanceFromNode(reactEventType) : null, null !== reactEventType && (accumulateTargetOnly = getNearestMountedFiber(reactEventType), inCapturePhase = reactEventType.tag, reactEventType !== accumulateTargetOnly || 5 !== inCapturePhase && 27 !== inCapturePhase && 6 !== inCapturePhase))
                reactEventType = null;
            } else SyntheticEventCtor = null, reactEventType = targetInst;
            if (SyntheticEventCtor !== reactEventType) {
              inCapturePhase = SyntheticMouseEvent;
              _instance = "onMouseLeave";
              reactEventName = "onMouseEnter";
              instance = "mouse";
              if ("pointerout" === domEventName || "pointerover" === domEventName)
                inCapturePhase = SyntheticPointerEvent, _instance = "onPointerLeave", reactEventName = "onPointerEnter", instance = "pointer";
              accumulateTargetOnly = null == SyntheticEventCtor ? reactName : getNodeFromInstance(SyntheticEventCtor);
              lastHostComponent = null == reactEventType ? reactName : getNodeFromInstance(reactEventType);
              reactName = new inCapturePhase(
                _instance,
                instance + "leave",
                SyntheticEventCtor,
                nativeEvent,
                nativeEventTarget
              );
              reactName.target = accumulateTargetOnly;
              reactName.relatedTarget = lastHostComponent;
              _instance = null;
              getClosestInstanceFromNode(nativeEventTarget) === targetInst && (inCapturePhase = new inCapturePhase(
                reactEventName,
                instance + "enter",
                reactEventType,
                nativeEvent,
                nativeEventTarget
              ), inCapturePhase.target = lastHostComponent, inCapturePhase.relatedTarget = accumulateTargetOnly, _instance = inCapturePhase);
              accumulateTargetOnly = _instance;
              if (SyntheticEventCtor && reactEventType)
                b: {
                  inCapturePhase = getParent;
                  reactEventName = SyntheticEventCtor;
                  instance = reactEventType;
                  lastHostComponent = 0;
                  for (_instance = reactEventName; _instance; _instance = inCapturePhase(_instance))
                    lastHostComponent++;
                  _instance = 0;
                  for (var tempB = instance; tempB; tempB = inCapturePhase(tempB))
                    _instance++;
                  for (; 0 < lastHostComponent - _instance; )
                    reactEventName = inCapturePhase(reactEventName), lastHostComponent--;
                  for (; 0 < _instance - lastHostComponent; )
                    instance = inCapturePhase(instance), _instance--;
                  for (; lastHostComponent--; ) {
                    if (reactEventName === instance || null !== instance && reactEventName === instance.alternate) {
                      inCapturePhase = reactEventName;
                      break b;
                    }
                    reactEventName = inCapturePhase(reactEventName);
                    instance = inCapturePhase(instance);
                  }
                  inCapturePhase = null;
                }
              else inCapturePhase = null;
              null !== SyntheticEventCtor && accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                reactName,
                SyntheticEventCtor,
                inCapturePhase,
                false
              );
              null !== reactEventType && null !== accumulateTargetOnly && accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                accumulateTargetOnly,
                reactEventType,
                inCapturePhase,
                true
              );
            }
          }
        }
        a: {
          reactName = targetInst ? getNodeFromInstance(targetInst) : window;
          SyntheticEventCtor = reactName.nodeName && reactName.nodeName.toLowerCase();
          if ("select" === SyntheticEventCtor || "input" === SyntheticEventCtor && "file" === reactName.type)
            var getTargetInstFunc = getTargetInstForChangeEvent;
          else if (isTextInputElement(reactName))
            if (isInputEventSupported)
              getTargetInstFunc = getTargetInstForInputOrChangeEvent;
            else {
              getTargetInstFunc = getTargetInstForInputEventPolyfill;
              var handleEventFunc = handleEventsForInputEventPolyfill;
            }
          else
            SyntheticEventCtor = reactName.nodeName, !SyntheticEventCtor || "input" !== SyntheticEventCtor.toLowerCase() || "checkbox" !== reactName.type && "radio" !== reactName.type ? targetInst && isCustomElement(targetInst.elementType) && (getTargetInstFunc = getTargetInstForChangeEvent) : getTargetInstFunc = getTargetInstForClickEvent;
          if (getTargetInstFunc && (getTargetInstFunc = getTargetInstFunc(domEventName, targetInst))) {
            createAndAccumulateChangeEvent(
              dispatchQueue,
              getTargetInstFunc,
              nativeEvent,
              nativeEventTarget
            );
            break a;
          }
          handleEventFunc && handleEventFunc(domEventName, reactName, targetInst);
          "focusout" === domEventName && targetInst && "number" === reactName.type && null != targetInst.memoizedProps.value && setDefaultValue(reactName, "number", reactName.value);
        }
        handleEventFunc = targetInst ? getNodeFromInstance(targetInst) : window;
        switch (domEventName) {
          case "focusin":
            if (isTextInputElement(handleEventFunc) || "true" === handleEventFunc.contentEditable)
              activeElement = handleEventFunc, activeElementInst = targetInst, lastSelection = null;
            break;
          case "focusout":
            lastSelection = activeElementInst = activeElement = null;
            break;
          case "mousedown":
            mouseDown = true;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            mouseDown = false;
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
            break;
          case "selectionchange":
            if (skipSelectionChangeEvent) break;
          case "keydown":
          case "keyup":
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
        }
        var fallbackData;
        if (canUseCompositionEvent)
          b: {
            switch (domEventName) {
              case "compositionstart":
                var eventType = "onCompositionStart";
                break b;
              case "compositionend":
                eventType = "onCompositionEnd";
                break b;
              case "compositionupdate":
                eventType = "onCompositionUpdate";
                break b;
            }
            eventType = void 0;
          }
        else
          isComposing ? isFallbackCompositionEnd(domEventName, nativeEvent) && (eventType = "onCompositionEnd") : "keydown" === domEventName && 229 === nativeEvent.keyCode && (eventType = "onCompositionStart");
        eventType && (useFallbackCompositionData && "ko" !== nativeEvent.locale && (isComposing || "onCompositionStart" !== eventType ? "onCompositionEnd" === eventType && isComposing && (fallbackData = getData()) : (root = nativeEventTarget, startText = "value" in root ? root.value : root.textContent, isComposing = true)), handleEventFunc = accumulateTwoPhaseListeners(targetInst, eventType), 0 < handleEventFunc.length && (eventType = new SyntheticCompositionEvent(
          eventType,
          domEventName,
          null,
          nativeEvent,
          nativeEventTarget
        ), dispatchQueue.push({ event: eventType, listeners: handleEventFunc }), fallbackData ? eventType.data = fallbackData : (fallbackData = getDataFromCustomEvent(nativeEvent), null !== fallbackData && (eventType.data = fallbackData))));
        if (fallbackData = canUseTextInputEvent ? getNativeBeforeInputChars(domEventName, nativeEvent) : getFallbackBeforeInputChars(domEventName, nativeEvent))
          eventType = accumulateTwoPhaseListeners(targetInst, "onBeforeInput"), 0 < eventType.length && (handleEventFunc = new SyntheticCompositionEvent(
            "onBeforeInput",
            "beforeinput",
            null,
            nativeEvent,
            nativeEventTarget
          ), dispatchQueue.push({
            event: handleEventFunc,
            listeners: eventType
          }), handleEventFunc.data = fallbackData);
        extractEvents$1(
          dispatchQueue,
          domEventName,
          targetInst,
          nativeEvent,
          nativeEventTarget
        );
      }
      processDispatchQueue(dispatchQueue, eventSystemFlags);
    });
  }
  function createDispatchListener(instance, listener, currentTarget) {
    return {
      instance,
      listener,
      currentTarget
    };
  }
  function accumulateTwoPhaseListeners(targetFiber, reactName) {
    for (var captureName = reactName + "Capture", listeners = []; null !== targetFiber; ) {
      var _instance2 = targetFiber, stateNode = _instance2.stateNode;
      _instance2 = _instance2.tag;
      5 !== _instance2 && 26 !== _instance2 && 27 !== _instance2 || null === stateNode || (_instance2 = getListener(targetFiber, captureName), null != _instance2 && listeners.unshift(
        createDispatchListener(targetFiber, _instance2, stateNode)
      ), _instance2 = getListener(targetFiber, reactName), null != _instance2 && listeners.push(
        createDispatchListener(targetFiber, _instance2, stateNode)
      ));
      if (3 === targetFiber.tag) return listeners;
      targetFiber = targetFiber.return;
    }
    return [];
  }
  function getParent(inst) {
    if (null === inst) return null;
    do
      inst = inst.return;
    while (inst && 5 !== inst.tag && 27 !== inst.tag);
    return inst ? inst : null;
  }
  function accumulateEnterLeaveListenersForEvent(dispatchQueue, event, target, common, inCapturePhase) {
    for (var registrationName = event._reactName, listeners = []; null !== target && target !== common; ) {
      var _instance3 = target, alternate = _instance3.alternate, stateNode = _instance3.stateNode;
      _instance3 = _instance3.tag;
      if (null !== alternate && alternate === common) break;
      5 !== _instance3 && 26 !== _instance3 && 27 !== _instance3 || null === stateNode || (alternate = stateNode, inCapturePhase ? (stateNode = getListener(target, registrationName), null != stateNode && listeners.unshift(
        createDispatchListener(target, stateNode, alternate)
      )) : inCapturePhase || (stateNode = getListener(target, registrationName), null != stateNode && listeners.push(
        createDispatchListener(target, stateNode, alternate)
      )));
      target = target.return;
    }
    0 !== listeners.length && dispatchQueue.push({ event, listeners });
  }
  var NORMALIZE_NEWLINES_REGEX = /\r\n?/g, NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;
  function normalizeMarkupForTextOrAttribute(markup) {
    return ("string" === typeof markup ? markup : "" + markup).replace(NORMALIZE_NEWLINES_REGEX, "\n").replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, "");
  }
  function checkForUnmatchedText(serverText, clientText) {
    clientText = normalizeMarkupForTextOrAttribute(clientText);
    return normalizeMarkupForTextOrAttribute(serverText) === clientText ? true : false;
  }
  function setProp(domElement, tag, key, value, props, prevValue) {
    switch (key) {
      case "children":
        "string" === typeof value ? "body" === tag || "textarea" === tag && "" === value || setTextContent(domElement, value) : ("number" === typeof value || "bigint" === typeof value) && "body" !== tag && setTextContent(domElement, "" + value);
        break;
      case "className":
        setValueForKnownAttribute(domElement, "class", value);
        break;
      case "tabIndex":
        setValueForKnownAttribute(domElement, "tabindex", value);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        setValueForKnownAttribute(domElement, key, value);
        break;
      case "style":
        setValueForStyles(domElement, value, prevValue);
        break;
      case "data":
        if ("object" !== tag) {
          setValueForKnownAttribute(domElement, "data", value);
          break;
        }
      case "src":
      case "href":
        if ("" === value && ("a" !== tag || "href" !== key)) {
          domElement.removeAttribute(key);
          break;
        }
        if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) {
          domElement.removeAttribute(key);
          break;
        }
        value = sanitizeURL("" + value);
        domElement.setAttribute(key, value);
        break;
      case "action":
      case "formAction":
        if ("function" === typeof value) {
          domElement.setAttribute(
            key,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          "function" === typeof prevValue && ("formAction" === key ? ("input" !== tag && setProp(domElement, tag, "name", props.name, props, null), setProp(
            domElement,
            tag,
            "formEncType",
            props.formEncType,
            props,
            null
          ), setProp(
            domElement,
            tag,
            "formMethod",
            props.formMethod,
            props,
            null
          ), setProp(
            domElement,
            tag,
            "formTarget",
            props.formTarget,
            props,
            null
          )) : (setProp(domElement, tag, "encType", props.encType, props, null), setProp(domElement, tag, "method", props.method, props, null), setProp(domElement, tag, "target", props.target, props, null)));
        if (null == value || "symbol" === typeof value || "boolean" === typeof value) {
          domElement.removeAttribute(key);
          break;
        }
        value = sanitizeURL("" + value);
        domElement.setAttribute(key, value);
        break;
      case "onClick":
        null != value && (domElement.onclick = noop$1);
        break;
      case "onScroll":
        null != value && listenToNonDelegatedEvent("scroll", domElement);
        break;
      case "onScrollEnd":
        null != value && listenToNonDelegatedEvent("scrollend", domElement);
        break;
      case "dangerouslySetInnerHTML":
        if (null != value) {
          if ("object" !== typeof value || !("__html" in value))
            throw Error(formatProdErrorMessage(61));
          key = value.__html;
          if (null != key) {
            if (null != props.children) throw Error(formatProdErrorMessage(60));
            domElement.innerHTML = key;
          }
        }
        break;
      case "multiple":
        domElement.multiple = value && "function" !== typeof value && "symbol" !== typeof value;
        break;
      case "muted":
        domElement.muted = value && "function" !== typeof value && "symbol" !== typeof value;
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (null == value || "function" === typeof value || "boolean" === typeof value || "symbol" === typeof value) {
          domElement.removeAttribute("xlink:href");
          break;
        }
        key = sanitizeURL("" + value);
        domElement.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          key
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, "" + value) : domElement.removeAttribute(key);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, "") : domElement.removeAttribute(key);
        break;
      case "capture":
      case "download":
        true === value ? domElement.setAttribute(key, "") : false !== value && null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        null != value && "function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
        break;
      case "rowSpan":
      case "start":
        null == value || "function" === typeof value || "symbol" === typeof value || isNaN(value) ? domElement.removeAttribute(key) : domElement.setAttribute(key, value);
        break;
      case "popover":
        listenToNonDelegatedEvent("beforetoggle", domElement);
        listenToNonDelegatedEvent("toggle", domElement);
        setValueForAttribute(domElement, "popover", value);
        break;
      case "xlinkActuate":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          value
        );
        break;
      case "xlinkArcrole":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          value
        );
        break;
      case "xlinkRole":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          value
        );
        break;
      case "xlinkShow":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          value
        );
        break;
      case "xlinkTitle":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          value
        );
        break;
      case "xlinkType":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          value
        );
        break;
      case "xmlBase":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          value
        );
        break;
      case "xmlLang":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          value
        );
        break;
      case "xmlSpace":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          value
        );
        break;
      case "is":
        setValueForAttribute(domElement, "is", value);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!(2 < key.length) || "o" !== key[0] && "O" !== key[0] || "n" !== key[1] && "N" !== key[1])
          key = aliases.get(key) || key, setValueForAttribute(domElement, key, value);
    }
  }
  function setPropOnCustomElement(domElement, tag, key, value, props, prevValue) {
    switch (key) {
      case "style":
        setValueForStyles(domElement, value, prevValue);
        break;
      case "dangerouslySetInnerHTML":
        if (null != value) {
          if ("object" !== typeof value || !("__html" in value))
            throw Error(formatProdErrorMessage(61));
          key = value.__html;
          if (null != key) {
            if (null != props.children) throw Error(formatProdErrorMessage(60));
            domElement.innerHTML = key;
          }
        }
        break;
      case "children":
        "string" === typeof value ? setTextContent(domElement, value) : ("number" === typeof value || "bigint" === typeof value) && setTextContent(domElement, "" + value);
        break;
      case "onScroll":
        null != value && listenToNonDelegatedEvent("scroll", domElement);
        break;
      case "onScrollEnd":
        null != value && listenToNonDelegatedEvent("scrollend", domElement);
        break;
      case "onClick":
        null != value && (domElement.onclick = noop$1);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!registrationNameDependencies.hasOwnProperty(key))
          a: {
            if ("o" === key[0] && "n" === key[1] && (props = key.endsWith("Capture"), tag = key.slice(2, props ? key.length - 7 : void 0), prevValue = domElement[internalPropsKey] || null, prevValue = null != prevValue ? prevValue[key] : null, "function" === typeof prevValue && domElement.removeEventListener(tag, prevValue, props), "function" === typeof value)) {
              "function" !== typeof prevValue && null !== prevValue && (key in domElement ? domElement[key] = null : domElement.hasAttribute(key) && domElement.removeAttribute(key));
              domElement.addEventListener(tag, value, props);
              break a;
            }
            key in domElement ? domElement[key] = value : true === value ? domElement.setAttribute(key, "") : setValueForAttribute(domElement, key, value);
          }
    }
  }
  function setInitialProperties(domElement, tag, props) {
    switch (tag) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        listenToNonDelegatedEvent("error", domElement);
        listenToNonDelegatedEvent("load", domElement);
        var hasSrc = false, hasSrcSet = false, propKey;
        for (propKey in props)
          if (props.hasOwnProperty(propKey)) {
            var propValue = props[propKey];
            if (null != propValue)
              switch (propKey) {
                case "src":
                  hasSrc = true;
                  break;
                case "srcSet":
                  hasSrcSet = true;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(formatProdErrorMessage(137, tag));
                default:
                  setProp(domElement, tag, propKey, propValue, props, null);
              }
          }
        hasSrcSet && setProp(domElement, tag, "srcSet", props.srcSet, props, null);
        hasSrc && setProp(domElement, tag, "src", props.src, props, null);
        return;
      case "input":
        listenToNonDelegatedEvent("invalid", domElement);
        var defaultValue = propKey = propValue = hasSrcSet = null, checked = null, defaultChecked = null;
        for (hasSrc in props)
          if (props.hasOwnProperty(hasSrc)) {
            var propValue$184 = props[hasSrc];
            if (null != propValue$184)
              switch (hasSrc) {
                case "name":
                  hasSrcSet = propValue$184;
                  break;
                case "type":
                  propValue = propValue$184;
                  break;
                case "checked":
                  checked = propValue$184;
                  break;
                case "defaultChecked":
                  defaultChecked = propValue$184;
                  break;
                case "value":
                  propKey = propValue$184;
                  break;
                case "defaultValue":
                  defaultValue = propValue$184;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (null != propValue$184)
                    throw Error(formatProdErrorMessage(137, tag));
                  break;
                default:
                  setProp(domElement, tag, hasSrc, propValue$184, props, null);
              }
          }
        initInput(
          domElement,
          propKey,
          defaultValue,
          checked,
          defaultChecked,
          propValue,
          hasSrcSet,
          false
        );
        return;
      case "select":
        listenToNonDelegatedEvent("invalid", domElement);
        hasSrc = propValue = propKey = null;
        for (hasSrcSet in props)
          if (props.hasOwnProperty(hasSrcSet) && (defaultValue = props[hasSrcSet], null != defaultValue))
            switch (hasSrcSet) {
              case "value":
                propKey = defaultValue;
                break;
              case "defaultValue":
                propValue = defaultValue;
                break;
              case "multiple":
                hasSrc = defaultValue;
              default:
                setProp(domElement, tag, hasSrcSet, defaultValue, props, null);
            }
        tag = propKey;
        props = propValue;
        domElement.multiple = !!hasSrc;
        null != tag ? updateOptions(domElement, !!hasSrc, tag, false) : null != props && updateOptions(domElement, !!hasSrc, props, true);
        return;
      case "textarea":
        listenToNonDelegatedEvent("invalid", domElement);
        propKey = hasSrcSet = hasSrc = null;
        for (propValue in props)
          if (props.hasOwnProperty(propValue) && (defaultValue = props[propValue], null != defaultValue))
            switch (propValue) {
              case "value":
                hasSrc = defaultValue;
                break;
              case "defaultValue":
                hasSrcSet = defaultValue;
                break;
              case "children":
                propKey = defaultValue;
                break;
              case "dangerouslySetInnerHTML":
                if (null != defaultValue) throw Error(formatProdErrorMessage(91));
                break;
              default:
                setProp(domElement, tag, propValue, defaultValue, props, null);
            }
        initTextarea(domElement, hasSrc, hasSrcSet, propKey);
        return;
      case "option":
        for (checked in props)
          if (props.hasOwnProperty(checked) && (hasSrc = props[checked], null != hasSrc))
            switch (checked) {
              case "selected":
                domElement.selected = hasSrc && "function" !== typeof hasSrc && "symbol" !== typeof hasSrc;
                break;
              default:
                setProp(domElement, tag, checked, hasSrc, props, null);
            }
        return;
      case "dialog":
        listenToNonDelegatedEvent("beforetoggle", domElement);
        listenToNonDelegatedEvent("toggle", domElement);
        listenToNonDelegatedEvent("cancel", domElement);
        listenToNonDelegatedEvent("close", domElement);
        break;
      case "iframe":
      case "object":
        listenToNonDelegatedEvent("load", domElement);
        break;
      case "video":
      case "audio":
        for (hasSrc = 0; hasSrc < mediaEventTypes.length; hasSrc++)
          listenToNonDelegatedEvent(mediaEventTypes[hasSrc], domElement);
        break;
      case "image":
        listenToNonDelegatedEvent("error", domElement);
        listenToNonDelegatedEvent("load", domElement);
        break;
      case "details":
        listenToNonDelegatedEvent("toggle", domElement);
        break;
      case "embed":
      case "source":
      case "link":
        listenToNonDelegatedEvent("error", domElement), listenToNonDelegatedEvent("load", domElement);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (defaultChecked in props)
          if (props.hasOwnProperty(defaultChecked) && (hasSrc = props[defaultChecked], null != hasSrc))
            switch (defaultChecked) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(137, tag));
              default:
                setProp(domElement, tag, defaultChecked, hasSrc, props, null);
            }
        return;
      default:
        if (isCustomElement(tag)) {
          for (propValue$184 in props)
            props.hasOwnProperty(propValue$184) && (hasSrc = props[propValue$184], void 0 !== hasSrc && setPropOnCustomElement(
              domElement,
              tag,
              propValue$184,
              hasSrc,
              props,
              void 0
            ));
          return;
        }
    }
    for (defaultValue in props)
      props.hasOwnProperty(defaultValue) && (hasSrc = props[defaultValue], null != hasSrc && setProp(domElement, tag, defaultValue, hasSrc, props, null));
  }
  function updateProperties(domElement, tag, lastProps, nextProps) {
    switch (tag) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var name = null, type = null, value = null, defaultValue = null, lastDefaultValue = null, checked = null, defaultChecked = null;
        for (propKey in lastProps) {
          var lastProp = lastProps[propKey];
          if (lastProps.hasOwnProperty(propKey) && null != lastProp)
            switch (propKey) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                lastDefaultValue = lastProp;
              default:
                nextProps.hasOwnProperty(propKey) || setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
        }
        for (var propKey$201 in nextProps) {
          var propKey = nextProps[propKey$201];
          lastProp = lastProps[propKey$201];
          if (nextProps.hasOwnProperty(propKey$201) && (null != propKey || null != lastProp))
            switch (propKey$201) {
              case "type":
                type = propKey;
                break;
              case "name":
                name = propKey;
                break;
              case "checked":
                checked = propKey;
                break;
              case "defaultChecked":
                defaultChecked = propKey;
                break;
              case "value":
                value = propKey;
                break;
              case "defaultValue":
                defaultValue = propKey;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (null != propKey)
                  throw Error(formatProdErrorMessage(137, tag));
                break;
              default:
                propKey !== lastProp && setProp(
                  domElement,
                  tag,
                  propKey$201,
                  propKey,
                  nextProps,
                  lastProp
                );
            }
        }
        updateInput(
          domElement,
          value,
          defaultValue,
          lastDefaultValue,
          checked,
          defaultChecked,
          type,
          name
        );
        return;
      case "select":
        propKey = value = defaultValue = propKey$201 = null;
        for (type in lastProps)
          if (lastDefaultValue = lastProps[type], lastProps.hasOwnProperty(type) && null != lastDefaultValue)
            switch (type) {
              case "value":
                break;
              case "multiple":
                propKey = lastDefaultValue;
              default:
                nextProps.hasOwnProperty(type) || setProp(
                  domElement,
                  tag,
                  type,
                  null,
                  nextProps,
                  lastDefaultValue
                );
            }
        for (name in nextProps)
          if (type = nextProps[name], lastDefaultValue = lastProps[name], nextProps.hasOwnProperty(name) && (null != type || null != lastDefaultValue))
            switch (name) {
              case "value":
                propKey$201 = type;
                break;
              case "defaultValue":
                defaultValue = type;
                break;
              case "multiple":
                value = type;
              default:
                type !== lastDefaultValue && setProp(
                  domElement,
                  tag,
                  name,
                  type,
                  nextProps,
                  lastDefaultValue
                );
            }
        tag = defaultValue;
        lastProps = value;
        nextProps = propKey;
        null != propKey$201 ? updateOptions(domElement, !!lastProps, propKey$201, false) : !!nextProps !== !!lastProps && (null != tag ? updateOptions(domElement, !!lastProps, tag, true) : updateOptions(domElement, !!lastProps, lastProps ? [] : "", false));
        return;
      case "textarea":
        propKey = propKey$201 = null;
        for (defaultValue in lastProps)
          if (name = lastProps[defaultValue], lastProps.hasOwnProperty(defaultValue) && null != name && !nextProps.hasOwnProperty(defaultValue))
            switch (defaultValue) {
              case "value":
                break;
              case "children":
                break;
              default:
                setProp(domElement, tag, defaultValue, null, nextProps, name);
            }
        for (value in nextProps)
          if (name = nextProps[value], type = lastProps[value], nextProps.hasOwnProperty(value) && (null != name || null != type))
            switch (value) {
              case "value":
                propKey$201 = name;
                break;
              case "defaultValue":
                propKey = name;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (null != name) throw Error(formatProdErrorMessage(91));
                break;
              default:
                name !== type && setProp(domElement, tag, value, name, nextProps, type);
            }
        updateTextarea(domElement, propKey$201, propKey);
        return;
      case "option":
        for (var propKey$217 in lastProps)
          if (propKey$201 = lastProps[propKey$217], lastProps.hasOwnProperty(propKey$217) && null != propKey$201 && !nextProps.hasOwnProperty(propKey$217))
            switch (propKey$217) {
              case "selected":
                domElement.selected = false;
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  propKey$217,
                  null,
                  nextProps,
                  propKey$201
                );
            }
        for (lastDefaultValue in nextProps)
          if (propKey$201 = nextProps[lastDefaultValue], propKey = lastProps[lastDefaultValue], nextProps.hasOwnProperty(lastDefaultValue) && propKey$201 !== propKey && (null != propKey$201 || null != propKey))
            switch (lastDefaultValue) {
              case "selected":
                domElement.selected = propKey$201 && "function" !== typeof propKey$201 && "symbol" !== typeof propKey$201;
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  lastDefaultValue,
                  propKey$201,
                  nextProps,
                  propKey
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var propKey$222 in lastProps)
          propKey$201 = lastProps[propKey$222], lastProps.hasOwnProperty(propKey$222) && null != propKey$201 && !nextProps.hasOwnProperty(propKey$222) && setProp(domElement, tag, propKey$222, null, nextProps, propKey$201);
        for (checked in nextProps)
          if (propKey$201 = nextProps[checked], propKey = lastProps[checked], nextProps.hasOwnProperty(checked) && propKey$201 !== propKey && (null != propKey$201 || null != propKey))
            switch (checked) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (null != propKey$201)
                  throw Error(formatProdErrorMessage(137, tag));
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  checked,
                  propKey$201,
                  nextProps,
                  propKey
                );
            }
        return;
      default:
        if (isCustomElement(tag)) {
          for (var propKey$227 in lastProps)
            propKey$201 = lastProps[propKey$227], lastProps.hasOwnProperty(propKey$227) && void 0 !== propKey$201 && !nextProps.hasOwnProperty(propKey$227) && setPropOnCustomElement(
              domElement,
              tag,
              propKey$227,
              void 0,
              nextProps,
              propKey$201
            );
          for (defaultChecked in nextProps)
            propKey$201 = nextProps[defaultChecked], propKey = lastProps[defaultChecked], !nextProps.hasOwnProperty(defaultChecked) || propKey$201 === propKey || void 0 === propKey$201 && void 0 === propKey || setPropOnCustomElement(
              domElement,
              tag,
              defaultChecked,
              propKey$201,
              nextProps,
              propKey
            );
          return;
        }
    }
    for (var propKey$232 in lastProps)
      propKey$201 = lastProps[propKey$232], lastProps.hasOwnProperty(propKey$232) && null != propKey$201 && !nextProps.hasOwnProperty(propKey$232) && setProp(domElement, tag, propKey$232, null, nextProps, propKey$201);
    for (lastProp in nextProps)
      propKey$201 = nextProps[lastProp], propKey = lastProps[lastProp], !nextProps.hasOwnProperty(lastProp) || propKey$201 === propKey || null == propKey$201 && null == propKey || setProp(domElement, tag, lastProp, propKey$201, nextProps, propKey);
  }
  function isLikelyStaticResource(initiatorType) {
    switch (initiatorType) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return true;
      default:
        return false;
    }
  }
  function estimateBandwidth() {
    if ("function" === typeof performance.getEntriesByType) {
      for (var count = 0, bits = 0, resourceEntries = performance.getEntriesByType("resource"), i = 0; i < resourceEntries.length; i++) {
        var entry = resourceEntries[i], transferSize = entry.transferSize, initiatorType = entry.initiatorType, duration = entry.duration;
        if (transferSize && duration && isLikelyStaticResource(initiatorType)) {
          initiatorType = 0;
          duration = entry.responseEnd;
          for (i += 1; i < resourceEntries.length; i++) {
            var overlapEntry = resourceEntries[i], overlapStartTime = overlapEntry.startTime;
            if (overlapStartTime > duration) break;
            var overlapTransferSize = overlapEntry.transferSize, overlapInitiatorType = overlapEntry.initiatorType;
            overlapTransferSize && isLikelyStaticResource(overlapInitiatorType) && (overlapEntry = overlapEntry.responseEnd, initiatorType += overlapTransferSize * (overlapEntry < duration ? 1 : (duration - overlapStartTime) / (overlapEntry - overlapStartTime)));
          }
          --i;
          bits += 8 * (transferSize + initiatorType) / (entry.duration / 1e3);
          count++;
          if (10 < count) break;
        }
      }
      if (0 < count) return bits / count / 1e6;
    }
    return navigator.connection && (count = navigator.connection.downlink, "number" === typeof count) ? count : 5;
  }
  var eventsEnabled = null, selectionInformation = null;
  function getOwnerDocumentFromRootContainer(rootContainerElement) {
    return 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
  }
  function getOwnHostContext(namespaceURI) {
    switch (namespaceURI) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function getChildHostContextProd(parentNamespace, type) {
    if (0 === parentNamespace)
      switch (type) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return 1 === parentNamespace && "foreignObject" === type ? 0 : parentNamespace;
  }
  function shouldSetTextContent(type, props) {
    return "textarea" === type || "noscript" === type || "string" === typeof props.children || "number" === typeof props.children || "bigint" === typeof props.children || "object" === typeof props.dangerouslySetInnerHTML && null !== props.dangerouslySetInnerHTML && null != props.dangerouslySetInnerHTML.__html;
  }
  var currentPopstateTransitionEvent = null;
  function shouldAttemptEagerTransition() {
    var event = window.event;
    if (event && "popstate" === event.type) {
      if (event === currentPopstateTransitionEvent) return false;
      currentPopstateTransitionEvent = event;
      return true;
    }
    currentPopstateTransitionEvent = null;
    return false;
  }
  var scheduleTimeout = "function" === typeof setTimeout ? setTimeout : void 0, cancelTimeout = "function" === typeof clearTimeout ? clearTimeout : void 0, localPromise = "function" === typeof Promise ? Promise : void 0, scheduleMicrotask = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof localPromise ? function(callback) {
    return localPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
  } : scheduleTimeout;
  function handleErrorInNextTick(error) {
    setTimeout(function() {
      throw error;
    });
  }
  function isSingletonScope(type) {
    return "head" === type;
  }
  function clearHydrationBoundary(parentInstance, hydrationInstance) {
    var node = hydrationInstance, depth = 0;
    do {
      var nextNode = node.nextSibling;
      parentInstance.removeChild(node);
      if (nextNode && 8 === nextNode.nodeType)
        if (node = nextNode.data, "/$" === node || "/&" === node) {
          if (0 === depth) {
            parentInstance.removeChild(nextNode);
            retryIfBlockedOn(hydrationInstance);
            return;
          }
          depth--;
        } else if ("$" === node || "$?" === node || "$~" === node || "$!" === node || "&" === node)
          depth++;
        else if ("html" === node)
          releaseSingletonInstance(parentInstance.ownerDocument.documentElement);
        else if ("head" === node) {
          node = parentInstance.ownerDocument.head;
          releaseSingletonInstance(node);
          for (var node$jscomp$0 = node.firstChild; node$jscomp$0; ) {
            var nextNode$jscomp$0 = node$jscomp$0.nextSibling, nodeName = node$jscomp$0.nodeName;
            node$jscomp$0[internalHoistableMarker] || "SCRIPT" === nodeName || "STYLE" === nodeName || "LINK" === nodeName && "stylesheet" === node$jscomp$0.rel.toLowerCase() || node.removeChild(node$jscomp$0);
            node$jscomp$0 = nextNode$jscomp$0;
          }
        } else
          "body" === node && releaseSingletonInstance(parentInstance.ownerDocument.body);
      node = nextNode;
    } while (node);
    retryIfBlockedOn(hydrationInstance);
  }
  function hideOrUnhideDehydratedBoundary(suspenseInstance, isHidden) {
    var node = suspenseInstance;
    suspenseInstance = 0;
    do {
      var nextNode = node.nextSibling;
      1 === node.nodeType ? isHidden ? (node._stashedDisplay = node.style.display, node.style.display = "none") : (node.style.display = node._stashedDisplay || "", "" === node.getAttribute("style") && node.removeAttribute("style")) : 3 === node.nodeType && (isHidden ? (node._stashedText = node.nodeValue, node.nodeValue = "") : node.nodeValue = node._stashedText || "");
      if (nextNode && 8 === nextNode.nodeType)
        if (node = nextNode.data, "/$" === node)
          if (0 === suspenseInstance) break;
          else suspenseInstance--;
        else
          "$" !== node && "$?" !== node && "$~" !== node && "$!" !== node || suspenseInstance++;
      node = nextNode;
    } while (node);
  }
  function clearContainerSparingly(container) {
    var nextNode = container.firstChild;
    nextNode && 10 === nextNode.nodeType && (nextNode = nextNode.nextSibling);
    for (; nextNode; ) {
      var node = nextNode;
      nextNode = nextNode.nextSibling;
      switch (node.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          clearContainerSparingly(node);
          detachDeletedInstance(node);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if ("stylesheet" === node.rel.toLowerCase()) continue;
      }
      container.removeChild(node);
    }
  }
  function canHydrateInstance(instance, type, props, inRootOrSingleton) {
    for (; 1 === instance.nodeType; ) {
      var anyProps = props;
      if (instance.nodeName.toLowerCase() !== type.toLowerCase()) {
        if (!inRootOrSingleton && ("INPUT" !== instance.nodeName || "hidden" !== instance.type))
          break;
      } else if (!inRootOrSingleton)
        if ("input" === type && "hidden" === instance.type) {
          var name = null == anyProps.name ? null : "" + anyProps.name;
          if ("hidden" === anyProps.type && instance.getAttribute("name") === name)
            return instance;
        } else return instance;
      else if (!instance[internalHoistableMarker])
        switch (type) {
          case "meta":
            if (!instance.hasAttribute("itemprop")) break;
            return instance;
          case "link":
            name = instance.getAttribute("rel");
            if ("stylesheet" === name && instance.hasAttribute("data-precedence"))
              break;
            else if (name !== anyProps.rel || instance.getAttribute("href") !== (null == anyProps.href || "" === anyProps.href ? null : anyProps.href) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin) || instance.getAttribute("title") !== (null == anyProps.title ? null : anyProps.title))
              break;
            return instance;
          case "style":
            if (instance.hasAttribute("data-precedence")) break;
            return instance;
          case "script":
            name = instance.getAttribute("src");
            if ((name !== (null == anyProps.src ? null : anyProps.src) || instance.getAttribute("type") !== (null == anyProps.type ? null : anyProps.type) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin)) && name && instance.hasAttribute("async") && !instance.hasAttribute("itemprop"))
              break;
            return instance;
          default:
            return instance;
        }
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) break;
    }
    return null;
  }
  function canHydrateTextInstance(instance, text, inRootOrSingleton) {
    if ("" === text) return null;
    for (; 3 !== instance.nodeType; ) {
      if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton)
        return null;
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) return null;
    }
    return instance;
  }
  function canHydrateHydrationBoundary(instance, inRootOrSingleton) {
    for (; 8 !== instance.nodeType; ) {
      if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton)
        return null;
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) return null;
    }
    return instance;
  }
  function isSuspenseInstancePending(instance) {
    return "$?" === instance.data || "$~" === instance.data;
  }
  function isSuspenseInstanceFallback(instance) {
    return "$!" === instance.data || "$?" === instance.data && "loading" !== instance.ownerDocument.readyState;
  }
  function registerSuspenseInstanceRetry(instance, callback) {
    var ownerDocument = instance.ownerDocument;
    if ("$~" === instance.data) instance._reactRetry = callback;
    else if ("$?" !== instance.data || "loading" !== ownerDocument.readyState)
      callback();
    else {
      var listener = function() {
        callback();
        ownerDocument.removeEventListener("DOMContentLoaded", listener);
      };
      ownerDocument.addEventListener("DOMContentLoaded", listener);
      instance._reactRetry = listener;
    }
  }
  function getNextHydratable(node) {
    for (; null != node; node = node.nextSibling) {
      var nodeType = node.nodeType;
      if (1 === nodeType || 3 === nodeType) break;
      if (8 === nodeType) {
        nodeType = node.data;
        if ("$" === nodeType || "$!" === nodeType || "$?" === nodeType || "$~" === nodeType || "&" === nodeType || "F!" === nodeType || "F" === nodeType)
          break;
        if ("/$" === nodeType || "/&" === nodeType) return null;
      }
    }
    return node;
  }
  var previousHydratableOnEnteringScopedSingleton = null;
  function getNextHydratableInstanceAfterHydrationBoundary(hydrationInstance) {
    hydrationInstance = hydrationInstance.nextSibling;
    for (var depth = 0; hydrationInstance; ) {
      if (8 === hydrationInstance.nodeType) {
        var data = hydrationInstance.data;
        if ("/$" === data || "/&" === data) {
          if (0 === depth)
            return getNextHydratable(hydrationInstance.nextSibling);
          depth--;
        } else
          "$" !== data && "$!" !== data && "$?" !== data && "$~" !== data && "&" !== data || depth++;
      }
      hydrationInstance = hydrationInstance.nextSibling;
    }
    return null;
  }
  function getParentHydrationBoundary(targetInstance) {
    targetInstance = targetInstance.previousSibling;
    for (var depth = 0; targetInstance; ) {
      if (8 === targetInstance.nodeType) {
        var data = targetInstance.data;
        if ("$" === data || "$!" === data || "$?" === data || "$~" === data || "&" === data) {
          if (0 === depth) return targetInstance;
          depth--;
        } else "/$" !== data && "/&" !== data || depth++;
      }
      targetInstance = targetInstance.previousSibling;
    }
    return null;
  }
  function resolveSingletonInstance(type, props, rootContainerInstance) {
    props = getOwnerDocumentFromRootContainer(rootContainerInstance);
    switch (type) {
      case "html":
        type = props.documentElement;
        if (!type) throw Error(formatProdErrorMessage(452));
        return type;
      case "head":
        type = props.head;
        if (!type) throw Error(formatProdErrorMessage(453));
        return type;
      case "body":
        type = props.body;
        if (!type) throw Error(formatProdErrorMessage(454));
        return type;
      default:
        throw Error(formatProdErrorMessage(451));
    }
  }
  function releaseSingletonInstance(instance) {
    for (var attributes = instance.attributes; attributes.length; )
      instance.removeAttributeNode(attributes[0]);
    detachDeletedInstance(instance);
  }
  var preloadPropsMap = /* @__PURE__ */ new Map(), preconnectsSet = /* @__PURE__ */ new Set();
  function getHoistableRoot(container) {
    return "function" === typeof container.getRootNode ? container.getRootNode() : 9 === container.nodeType ? container : container.ownerDocument;
  }
  var previousDispatcher = ReactDOMSharedInternals.d;
  ReactDOMSharedInternals.d = {
    f: flushSyncWork,
    r: requestFormReset,
    D: prefetchDNS,
    C: preconnect,
    L: preload2,
    m: preloadModule,
    X: preinitScript,
    S: preinitStyle,
    M: preinitModuleScript
  };
  function flushSyncWork() {
    var previousWasRendering = previousDispatcher.f(), wasRendering = flushSyncWork$1();
    return previousWasRendering || wasRendering;
  }
  function requestFormReset(form) {
    var formInst = getInstanceFromNode(form);
    null !== formInst && 5 === formInst.tag && "form" === formInst.type ? requestFormReset$1(formInst) : previousDispatcher.r(form);
  }
  var globalDocument = "undefined" === typeof document ? null : document;
  function preconnectAs(rel, href, crossOrigin) {
    var ownerDocument = globalDocument;
    if (ownerDocument && "string" === typeof href && href) {
      var limitedEscapedHref = escapeSelectorAttributeValueInsideDoubleQuotes(href);
      limitedEscapedHref = 'link[rel="' + rel + '"][href="' + limitedEscapedHref + '"]';
      "string" === typeof crossOrigin && (limitedEscapedHref += '[crossorigin="' + crossOrigin + '"]');
      preconnectsSet.has(limitedEscapedHref) || (preconnectsSet.add(limitedEscapedHref), rel = { rel, crossOrigin, href }, null === ownerDocument.querySelector(limitedEscapedHref) && (href = ownerDocument.createElement("link"), setInitialProperties(href, "link", rel), markNodeAsHoistable(href), ownerDocument.head.appendChild(href)));
    }
  }
  function prefetchDNS(href) {
    previousDispatcher.D(href);
    preconnectAs("dns-prefetch", href, null);
  }
  function preconnect(href, crossOrigin) {
    previousDispatcher.C(href, crossOrigin);
    preconnectAs("preconnect", href, crossOrigin);
  }
  function preload2(href, as, options2) {
    previousDispatcher.L(href, as, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href && as) {
      var preloadSelector = 'link[rel="preload"][as="' + escapeSelectorAttributeValueInsideDoubleQuotes(as) + '"]';
      "image" === as ? options2 && options2.imageSrcSet ? (preloadSelector += '[imagesrcset="' + escapeSelectorAttributeValueInsideDoubleQuotes(
        options2.imageSrcSet
      ) + '"]', "string" === typeof options2.imageSizes && (preloadSelector += '[imagesizes="' + escapeSelectorAttributeValueInsideDoubleQuotes(
        options2.imageSizes
      ) + '"]')) : preloadSelector += '[href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]' : preloadSelector += '[href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]';
      var key = preloadSelector;
      switch (as) {
        case "style":
          key = getStyleKey(href);
          break;
        case "script":
          key = getScriptKey(href);
      }
      preloadPropsMap.has(key) || (href = assign(
        {
          rel: "preload",
          href: "image" === as && options2 && options2.imageSrcSet ? void 0 : href,
          as
        },
        options2
      ), preloadPropsMap.set(key, href), null !== ownerDocument.querySelector(preloadSelector) || "style" === as && ownerDocument.querySelector(getStylesheetSelectorFromKey(key)) || "script" === as && ownerDocument.querySelector(getScriptSelectorFromKey(key)) || (as = ownerDocument.createElement("link"), setInitialProperties(as, "link", href), markNodeAsHoistable(as), ownerDocument.head.appendChild(as)));
    }
  }
  function preloadModule(href, options2) {
    previousDispatcher.m(href, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href) {
      var as = options2 && "string" === typeof options2.as ? options2.as : "script", preloadSelector = 'link[rel="modulepreload"][as="' + escapeSelectorAttributeValueInsideDoubleQuotes(as) + '"][href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]', key = preloadSelector;
      switch (as) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          key = getScriptKey(href);
      }
      if (!preloadPropsMap.has(key) && (href = assign({ rel: "modulepreload", href }, options2), preloadPropsMap.set(key, href), null === ownerDocument.querySelector(preloadSelector))) {
        switch (as) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (ownerDocument.querySelector(getScriptSelectorFromKey(key)))
              return;
        }
        as = ownerDocument.createElement("link");
        setInitialProperties(as, "link", href);
        markNodeAsHoistable(as);
        ownerDocument.head.appendChild(as);
      }
    }
  }
  function preinitStyle(href, precedence, options2) {
    previousDispatcher.S(href, precedence, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href) {
      var styles = getResourcesFromRoot(ownerDocument).hoistableStyles, key = getStyleKey(href);
      precedence = precedence || "default";
      var resource = styles.get(key);
      if (!resource) {
        var state = { loading: 0, preload: null };
        if (resource = ownerDocument.querySelector(
          getStylesheetSelectorFromKey(key)
        ))
          state.loading = 5;
        else {
          href = assign(
            { rel: "stylesheet", href, "data-precedence": precedence },
            options2
          );
          (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(href, options2);
          var link = resource = ownerDocument.createElement("link");
          markNodeAsHoistable(link);
          setInitialProperties(link, "link", href);
          link._p = new Promise(function(resolve, reject) {
            link.onload = resolve;
            link.onerror = reject;
          });
          link.addEventListener("load", function() {
            state.loading |= 1;
          });
          link.addEventListener("error", function() {
            state.loading |= 2;
          });
          state.loading |= 4;
          insertStylesheet(resource, precedence, ownerDocument);
        }
        resource = {
          type: "stylesheet",
          instance: resource,
          count: 1,
          state
        };
        styles.set(key, resource);
      }
    }
  }
  function preinitScript(src, options2) {
    previousDispatcher.X(src, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && src) {
      var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
      resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({ src, async: true }, options2), (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options2), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }, scripts.set(key, resource));
    }
  }
  function preinitModuleScript(src, options2) {
    previousDispatcher.M(src, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && src) {
      var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
      resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({ src, async: true, type: "module" }, options2), (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options2), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }, scripts.set(key, resource));
    }
  }
  function getResource(type, currentProps, pendingProps, currentResource) {
    var JSCompiler_inline_result = (JSCompiler_inline_result = rootInstanceStackCursor.current) ? getHoistableRoot(JSCompiler_inline_result) : null;
    if (!JSCompiler_inline_result) throw Error(formatProdErrorMessage(446));
    switch (type) {
      case "meta":
      case "title":
        return null;
      case "style":
        return "string" === typeof pendingProps.precedence && "string" === typeof pendingProps.href ? (currentProps = getStyleKey(pendingProps.href), pendingProps = getResourcesFromRoot(
          JSCompiler_inline_result
        ).hoistableStyles, currentResource = pendingProps.get(currentProps), currentResource || (currentResource = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, pendingProps.set(currentProps, currentResource)), currentResource) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if ("stylesheet" === pendingProps.rel && "string" === typeof pendingProps.href && "string" === typeof pendingProps.precedence) {
          type = getStyleKey(pendingProps.href);
          var styles$243 = getResourcesFromRoot(
            JSCompiler_inline_result
          ).hoistableStyles, resource$244 = styles$243.get(type);
          resource$244 || (JSCompiler_inline_result = JSCompiler_inline_result.ownerDocument || JSCompiler_inline_result, resource$244 = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, styles$243.set(type, resource$244), (styles$243 = JSCompiler_inline_result.querySelector(
            getStylesheetSelectorFromKey(type)
          )) && !styles$243._p && (resource$244.instance = styles$243, resource$244.state.loading = 5), preloadPropsMap.has(type) || (pendingProps = {
            rel: "preload",
            as: "style",
            href: pendingProps.href,
            crossOrigin: pendingProps.crossOrigin,
            integrity: pendingProps.integrity,
            media: pendingProps.media,
            hrefLang: pendingProps.hrefLang,
            referrerPolicy: pendingProps.referrerPolicy
          }, preloadPropsMap.set(type, pendingProps), styles$243 || preloadStylesheet(
            JSCompiler_inline_result,
            type,
            pendingProps,
            resource$244.state
          )));
          if (currentProps && null === currentResource)
            throw Error(formatProdErrorMessage(528, ""));
          return resource$244;
        }
        if (currentProps && null !== currentResource)
          throw Error(formatProdErrorMessage(529, ""));
        return null;
      case "script":
        return currentProps = pendingProps.async, pendingProps = pendingProps.src, "string" === typeof pendingProps && currentProps && "function" !== typeof currentProps && "symbol" !== typeof currentProps ? (currentProps = getScriptKey(pendingProps), pendingProps = getResourcesFromRoot(
          JSCompiler_inline_result
        ).hoistableScripts, currentResource = pendingProps.get(currentProps), currentResource || (currentResource = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, pendingProps.set(currentProps, currentResource)), currentResource) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(formatProdErrorMessage(444, type));
    }
  }
  function getStyleKey(href) {
    return 'href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"';
  }
  function getStylesheetSelectorFromKey(key) {
    return 'link[rel="stylesheet"][' + key + "]";
  }
  function stylesheetPropsFromRawProps(rawProps) {
    return assign({}, rawProps, {
      "data-precedence": rawProps.precedence,
      precedence: null
    });
  }
  function preloadStylesheet(ownerDocument, key, preloadProps, state) {
    ownerDocument.querySelector('link[rel="preload"][as="style"][' + key + "]") ? state.loading = 1 : (key = ownerDocument.createElement("link"), state.preload = key, key.addEventListener("load", function() {
      return state.loading |= 1;
    }), key.addEventListener("error", function() {
      return state.loading |= 2;
    }), setInitialProperties(key, "link", preloadProps), markNodeAsHoistable(key), ownerDocument.head.appendChild(key));
  }
  function getScriptKey(src) {
    return '[src="' + escapeSelectorAttributeValueInsideDoubleQuotes(src) + '"]';
  }
  function getScriptSelectorFromKey(key) {
    return "script[async]" + key;
  }
  function acquireResource(hoistableRoot, resource, props) {
    resource.count++;
    if (null === resource.instance)
      switch (resource.type) {
        case "style":
          var instance = hoistableRoot.querySelector(
            'style[data-href~="' + escapeSelectorAttributeValueInsideDoubleQuotes(props.href) + '"]'
          );
          if (instance)
            return resource.instance = instance, markNodeAsHoistable(instance), instance;
          var styleProps = assign({}, props, {
            "data-href": props.href,
            "data-precedence": props.precedence,
            href: null,
            precedence: null
          });
          instance = (hoistableRoot.ownerDocument || hoistableRoot).createElement(
            "style"
          );
          markNodeAsHoistable(instance);
          setInitialProperties(instance, "style", styleProps);
          insertStylesheet(instance, props.precedence, hoistableRoot);
          return resource.instance = instance;
        case "stylesheet":
          styleProps = getStyleKey(props.href);
          var instance$249 = hoistableRoot.querySelector(
            getStylesheetSelectorFromKey(styleProps)
          );
          if (instance$249)
            return resource.state.loading |= 4, resource.instance = instance$249, markNodeAsHoistable(instance$249), instance$249;
          instance = stylesheetPropsFromRawProps(props);
          (styleProps = preloadPropsMap.get(styleProps)) && adoptPreloadPropsForStylesheet(instance, styleProps);
          instance$249 = (hoistableRoot.ownerDocument || hoistableRoot).createElement("link");
          markNodeAsHoistable(instance$249);
          var linkInstance = instance$249;
          linkInstance._p = new Promise(function(resolve, reject) {
            linkInstance.onload = resolve;
            linkInstance.onerror = reject;
          });
          setInitialProperties(instance$249, "link", instance);
          resource.state.loading |= 4;
          insertStylesheet(instance$249, props.precedence, hoistableRoot);
          return resource.instance = instance$249;
        case "script":
          instance$249 = getScriptKey(props.src);
          if (styleProps = hoistableRoot.querySelector(
            getScriptSelectorFromKey(instance$249)
          ))
            return resource.instance = styleProps, markNodeAsHoistable(styleProps), styleProps;
          instance = props;
          if (styleProps = preloadPropsMap.get(instance$249))
            instance = assign({}, props), adoptPreloadPropsForScript(instance, styleProps);
          hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
          styleProps = hoistableRoot.createElement("script");
          markNodeAsHoistable(styleProps);
          setInitialProperties(styleProps, "link", instance);
          hoistableRoot.head.appendChild(styleProps);
          return resource.instance = styleProps;
        case "void":
          return null;
        default:
          throw Error(formatProdErrorMessage(443, resource.type));
      }
    else
      "stylesheet" === resource.type && 0 === (resource.state.loading & 4) && (instance = resource.instance, resource.state.loading |= 4, insertStylesheet(instance, props.precedence, hoistableRoot));
    return resource.instance;
  }
  function insertStylesheet(instance, precedence, root2) {
    for (var nodes = root2.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), last = nodes.length ? nodes[nodes.length - 1] : null, prior = last, i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.dataset.precedence === precedence) prior = node;
      else if (prior !== last) break;
    }
    prior ? prior.parentNode.insertBefore(instance, prior.nextSibling) : (precedence = 9 === root2.nodeType ? root2.head : root2, precedence.insertBefore(instance, precedence.firstChild));
  }
  function adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps) {
    null == stylesheetProps.crossOrigin && (stylesheetProps.crossOrigin = preloadProps.crossOrigin);
    null == stylesheetProps.referrerPolicy && (stylesheetProps.referrerPolicy = preloadProps.referrerPolicy);
    null == stylesheetProps.title && (stylesheetProps.title = preloadProps.title);
  }
  function adoptPreloadPropsForScript(scriptProps, preloadProps) {
    null == scriptProps.crossOrigin && (scriptProps.crossOrigin = preloadProps.crossOrigin);
    null == scriptProps.referrerPolicy && (scriptProps.referrerPolicy = preloadProps.referrerPolicy);
    null == scriptProps.integrity && (scriptProps.integrity = preloadProps.integrity);
  }
  var tagCaches = null;
  function getHydratableHoistableCache(type, keyAttribute, ownerDocument) {
    if (null === tagCaches) {
      var cache = /* @__PURE__ */ new Map();
      var caches = tagCaches = /* @__PURE__ */ new Map();
      caches.set(ownerDocument, cache);
    } else
      caches = tagCaches, cache = caches.get(ownerDocument), cache || (cache = /* @__PURE__ */ new Map(), caches.set(ownerDocument, cache));
    if (cache.has(type)) return cache;
    cache.set(type, null);
    ownerDocument = ownerDocument.getElementsByTagName(type);
    for (caches = 0; caches < ownerDocument.length; caches++) {
      var node = ownerDocument[caches];
      if (!(node[internalHoistableMarker] || node[internalInstanceKey] || "link" === type && "stylesheet" === node.getAttribute("rel")) && "http://www.w3.org/2000/svg" !== node.namespaceURI) {
        var nodeKey = node.getAttribute(keyAttribute) || "";
        nodeKey = type + nodeKey;
        var existing = cache.get(nodeKey);
        existing ? existing.push(node) : cache.set(nodeKey, [node]);
      }
    }
    return cache;
  }
  function mountHoistable(hoistableRoot, type, instance) {
    hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
    hoistableRoot.head.insertBefore(
      instance,
      "title" === type ? hoistableRoot.querySelector("head > title") : null
    );
  }
  function isHostHoistableType(type, props, hostContext) {
    if (1 === hostContext || null != props.itemProp) return false;
    switch (type) {
      case "meta":
      case "title":
        return true;
      case "style":
        if ("string" !== typeof props.precedence || "string" !== typeof props.href || "" === props.href)
          break;
        return true;
      case "link":
        if ("string" !== typeof props.rel || "string" !== typeof props.href || "" === props.href || props.onLoad || props.onError)
          break;
        switch (props.rel) {
          case "stylesheet":
            return type = props.disabled, "string" === typeof props.precedence && null == type;
          default:
            return true;
        }
      case "script":
        if (props.async && "function" !== typeof props.async && "symbol" !== typeof props.async && !props.onLoad && !props.onError && props.src && "string" === typeof props.src)
          return true;
    }
    return false;
  }
  function preloadResource(resource) {
    return "stylesheet" === resource.type && 0 === (resource.state.loading & 3) ? false : true;
  }
  function suspendResource(state, hoistableRoot, resource, props) {
    if ("stylesheet" === resource.type && ("string" !== typeof props.media || false !== matchMedia(props.media).matches) && 0 === (resource.state.loading & 4)) {
      if (null === resource.instance) {
        var key = getStyleKey(props.href), instance = hoistableRoot.querySelector(
          getStylesheetSelectorFromKey(key)
        );
        if (instance) {
          hoistableRoot = instance._p;
          null !== hoistableRoot && "object" === typeof hoistableRoot && "function" === typeof hoistableRoot.then && (state.count++, state = onUnsuspend.bind(state), hoistableRoot.then(state, state));
          resource.state.loading |= 4;
          resource.instance = instance;
          markNodeAsHoistable(instance);
          return;
        }
        instance = hoistableRoot.ownerDocument || hoistableRoot;
        props = stylesheetPropsFromRawProps(props);
        (key = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(props, key);
        instance = instance.createElement("link");
        markNodeAsHoistable(instance);
        var linkInstance = instance;
        linkInstance._p = new Promise(function(resolve, reject) {
          linkInstance.onload = resolve;
          linkInstance.onerror = reject;
        });
        setInitialProperties(instance, "link", props);
        resource.instance = instance;
      }
      null === state.stylesheets && (state.stylesheets = /* @__PURE__ */ new Map());
      state.stylesheets.set(resource, hoistableRoot);
      (hoistableRoot = resource.state.preload) && 0 === (resource.state.loading & 3) && (state.count++, resource = onUnsuspend.bind(state), hoistableRoot.addEventListener("load", resource), hoistableRoot.addEventListener("error", resource));
    }
  }
  var estimatedBytesWithinLimit = 0;
  function waitForCommitToBeReady(state, timeoutOffset) {
    state.stylesheets && 0 === state.count && insertSuspendedStylesheets(state, state.stylesheets);
    return 0 < state.count || 0 < state.imgCount ? function(commit) {
      var stylesheetTimer = setTimeout(function() {
        state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets);
        if (state.unsuspend) {
          var unsuspend = state.unsuspend;
          state.unsuspend = null;
          unsuspend();
        }
      }, 6e4 + timeoutOffset);
      0 < state.imgBytes && 0 === estimatedBytesWithinLimit && (estimatedBytesWithinLimit = 62500 * estimateBandwidth());
      var imgTimer = setTimeout(
        function() {
          state.waitingForImages = false;
          if (0 === state.count && (state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets), state.unsuspend)) {
            var unsuspend = state.unsuspend;
            state.unsuspend = null;
            unsuspend();
          }
        },
        (state.imgBytes > estimatedBytesWithinLimit ? 50 : 800) + timeoutOffset
      );
      state.unsuspend = commit;
      return function() {
        state.unsuspend = null;
        clearTimeout(stylesheetTimer);
        clearTimeout(imgTimer);
      };
    } : null;
  }
  function onUnsuspend() {
    this.count--;
    if (0 === this.count && (0 === this.imgCount || !this.waitingForImages)) {
      if (this.stylesheets) insertSuspendedStylesheets(this, this.stylesheets);
      else if (this.unsuspend) {
        var unsuspend = this.unsuspend;
        this.unsuspend = null;
        unsuspend();
      }
    }
  }
  var precedencesByRoot = null;
  function insertSuspendedStylesheets(state, resources) {
    state.stylesheets = null;
    null !== state.unsuspend && (state.count++, precedencesByRoot = /* @__PURE__ */ new Map(), resources.forEach(insertStylesheetIntoRoot, state), precedencesByRoot = null, onUnsuspend.call(state));
  }
  function insertStylesheetIntoRoot(root2, resource) {
    if (!(resource.state.loading & 4)) {
      var precedences = precedencesByRoot.get(root2);
      if (precedences) var last = precedences.get(null);
      else {
        precedences = /* @__PURE__ */ new Map();
        precedencesByRoot.set(root2, precedences);
        for (var nodes = root2.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if ("LINK" === node.nodeName || "not all" !== node.getAttribute("media"))
            precedences.set(node.dataset.precedence, node), last = node;
        }
        last && precedences.set(null, last);
      }
      nodes = resource.instance;
      node = nodes.getAttribute("data-precedence");
      i = precedences.get(node) || last;
      i === last && precedences.set(null, nodes);
      precedences.set(node, nodes);
      this.count++;
      last = onUnsuspend.bind(this);
      nodes.addEventListener("load", last);
      nodes.addEventListener("error", last);
      i ? i.parentNode.insertBefore(nodes, i.nextSibling) : (root2 = 9 === root2.nodeType ? root2.head : root2, root2.insertBefore(nodes, root2.firstChild));
      resource.state.loading |= 4;
    }
  }
  var HostTransitionContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Provider: null,
    Consumer: null,
    _currentValue: sharedNotPendingObject,
    _currentValue2: sharedNotPendingObject,
    _threadCount: 0
  };
  function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, formState) {
    this.tag = 1;
    this.containerInfo = containerInfo;
    this.pingCache = this.current = this.pendingChildren = null;
    this.timeoutHandle = -1;
    this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null;
    this.callbackPriority = 0;
    this.expirationTimes = createLaneMap(-1);
    this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
    this.entanglements = createLaneMap(0);
    this.hiddenUpdates = createLaneMap(null);
    this.identifierPrefix = identifierPrefix;
    this.onUncaughtError = onUncaughtError;
    this.onCaughtError = onCaughtError;
    this.onRecoverableError = onRecoverableError;
    this.pooledCache = null;
    this.pooledCacheLanes = 0;
    this.formState = formState;
    this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, formState, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator) {
    containerInfo = new FiberRootNode(
      containerInfo,
      tag,
      hydrate,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      formState
    );
    tag = 1;
    true === isStrictMode && (tag |= 24);
    isStrictMode = createFiberImplClass(3, null, null, tag);
    containerInfo.current = isStrictMode;
    isStrictMode.stateNode = containerInfo;
    tag = createCache();
    tag.refCount++;
    containerInfo.pooledCache = tag;
    tag.refCount++;
    isStrictMode.memoizedState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: tag
    };
    initializeUpdateQueue(isStrictMode);
    return containerInfo;
  }
  function getContextForSubtree(parentComponent) {
    if (!parentComponent) return emptyContextObject;
    parentComponent = emptyContextObject;
    return parentComponent;
  }
  function updateContainerImpl(rootFiber, lane, element, container, parentComponent, callback) {
    parentComponent = getContextForSubtree(parentComponent);
    null === container.context ? container.context = parentComponent : container.pendingContext = parentComponent;
    container = createUpdate(lane);
    container.payload = { element };
    callback = void 0 === callback ? null : callback;
    null !== callback && (container.callback = callback);
    element = enqueueUpdate(rootFiber, container, lane);
    null !== element && (scheduleUpdateOnFiber(element, rootFiber, lane), entangleTransitions(element, rootFiber, lane));
  }
  function markRetryLaneImpl(fiber, retryLane) {
    fiber = fiber.memoizedState;
    if (null !== fiber && null !== fiber.dehydrated) {
      var a = fiber.retryLane;
      fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
    }
  }
  function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
  }
  function attemptContinuousHydration(fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var root2 = enqueueConcurrentRenderForLane(fiber, 67108864);
      null !== root2 && scheduleUpdateOnFiber(root2, fiber, 67108864);
      markRetryLaneIfNotHydrated(fiber, 67108864);
    }
  }
  function attemptHydrationAtCurrentPriority(fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var lane = requestUpdateLane();
      lane = getBumpedLaneForHydrationByLane(lane);
      var root2 = enqueueConcurrentRenderForLane(fiber, lane);
      null !== root2 && scheduleUpdateOnFiber(root2, fiber, lane);
      markRetryLaneIfNotHydrated(fiber, lane);
    }
  }
  var _enabled = true;
  function dispatchDiscreteEvent(domEventName, eventSystemFlags, container, nativeEvent) {
    var prevTransition = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 2, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
    }
  }
  function dispatchContinuousEvent(domEventName, eventSystemFlags, container, nativeEvent) {
    var prevTransition = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 8, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
    }
  }
  function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (_enabled) {
      var blockedOn = findInstanceBlockingEvent(nativeEvent);
      if (null === blockedOn)
        dispatchEventForPluginEventSystem(
          domEventName,
          eventSystemFlags,
          nativeEvent,
          return_targetInst,
          targetContainer
        ), clearIfContinuousEvent(domEventName, nativeEvent);
      else if (queueIfContinuousEvent(
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        nativeEvent
      ))
        nativeEvent.stopPropagation();
      else if (clearIfContinuousEvent(domEventName, nativeEvent), eventSystemFlags & 4 && -1 < discreteReplayableEvents.indexOf(domEventName)) {
        for (; null !== blockedOn; ) {
          var fiber = getInstanceFromNode(blockedOn);
          if (null !== fiber)
            switch (fiber.tag) {
              case 3:
                fiber = fiber.stateNode;
                if (fiber.current.memoizedState.isDehydrated) {
                  var lanes = getHighestPriorityLanes(fiber.pendingLanes);
                  if (0 !== lanes) {
                    var root2 = fiber;
                    root2.pendingLanes |= 2;
                    for (root2.entangledLanes |= 2; lanes; ) {
                      var lane = 1 << 31 - clz32(lanes);
                      root2.entanglements[1] |= lane;
                      lanes &= ~lane;
                    }
                    ensureRootIsScheduled(fiber);
                    0 === (executionContext & 6) && (workInProgressRootRenderTargetTime = now() + 500, flushSyncWorkAcrossRoots_impl(0));
                  }
                }
                break;
              case 31:
              case 13:
                root2 = enqueueConcurrentRenderForLane(fiber, 2), null !== root2 && scheduleUpdateOnFiber(root2, fiber, 2), flushSyncWork$1(), markRetryLaneIfNotHydrated(fiber, 2);
            }
          fiber = findInstanceBlockingEvent(nativeEvent);
          null === fiber && dispatchEventForPluginEventSystem(
            domEventName,
            eventSystemFlags,
            nativeEvent,
            return_targetInst,
            targetContainer
          );
          if (fiber === blockedOn) break;
          blockedOn = fiber;
        }
        null !== blockedOn && nativeEvent.stopPropagation();
      } else
        dispatchEventForPluginEventSystem(
          domEventName,
          eventSystemFlags,
          nativeEvent,
          null,
          targetContainer
        );
    }
  }
  function findInstanceBlockingEvent(nativeEvent) {
    nativeEvent = getEventTarget(nativeEvent);
    return findInstanceBlockingTarget(nativeEvent);
  }
  var return_targetInst = null;
  function findInstanceBlockingTarget(targetNode) {
    return_targetInst = null;
    targetNode = getClosestInstanceFromNode(targetNode);
    if (null !== targetNode) {
      var nearestMounted = getNearestMountedFiber(targetNode);
      if (null === nearestMounted) targetNode = null;
      else {
        var tag = nearestMounted.tag;
        if (13 === tag) {
          targetNode = getSuspenseInstanceFromFiber(nearestMounted);
          if (null !== targetNode) return targetNode;
          targetNode = null;
        } else if (31 === tag) {
          targetNode = getActivityInstanceFromFiber(nearestMounted);
          if (null !== targetNode) return targetNode;
          targetNode = null;
        } else if (3 === tag) {
          if (nearestMounted.stateNode.current.memoizedState.isDehydrated)
            return 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
          targetNode = null;
        } else nearestMounted !== targetNode && (targetNode = null);
      }
    }
    return_targetInst = targetNode;
    return null;
  }
  function getEventPriority(domEventName) {
    switch (domEventName) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (getCurrentPriorityLevel()) {
          case ImmediatePriority:
            return 2;
          case UserBlockingPriority:
            return 8;
          case NormalPriority$1:
          case LowPriority:
            return 32;
          case IdlePriority:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var hasScheduledReplayAttempt = false, queuedFocus = null, queuedDrag = null, queuedMouse = null, queuedPointers = /* @__PURE__ */ new Map(), queuedPointerCaptures = /* @__PURE__ */ new Map(), queuedExplicitHydrationTargets = [], discreteReplayableEvents = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function clearIfContinuousEvent(domEventName, nativeEvent) {
    switch (domEventName) {
      case "focusin":
      case "focusout":
        queuedFocus = null;
        break;
      case "dragenter":
      case "dragleave":
        queuedDrag = null;
        break;
      case "mouseover":
      case "mouseout":
        queuedMouse = null;
        break;
      case "pointerover":
      case "pointerout":
        queuedPointers.delete(nativeEvent.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        queuedPointerCaptures.delete(nativeEvent.pointerId);
    }
  }
  function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (null === existingQueuedEvent || existingQueuedEvent.nativeEvent !== nativeEvent)
      return existingQueuedEvent = {
        blockedOn,
        domEventName,
        eventSystemFlags,
        nativeEvent,
        targetContainers: [targetContainer]
      }, null !== blockedOn && (blockedOn = getInstanceFromNode(blockedOn), null !== blockedOn && attemptContinuousHydration(blockedOn)), existingQueuedEvent;
    existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
    blockedOn = existingQueuedEvent.targetContainers;
    null !== targetContainer && -1 === blockedOn.indexOf(targetContainer) && blockedOn.push(targetContainer);
    return existingQueuedEvent;
  }
  function queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    switch (domEventName) {
      case "focusin":
        return queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedFocus,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "dragenter":
        return queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedDrag,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "mouseover":
        return queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedMouse,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "pointerover":
        var pointerId = nativeEvent.pointerId;
        queuedPointers.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointers.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        );
        return true;
      case "gotpointercapture":
        return pointerId = nativeEvent.pointerId, queuedPointerCaptures.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointerCaptures.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        ), true;
    }
    return false;
  }
  function attemptExplicitHydrationTarget(queuedTarget) {
    var targetInst = getClosestInstanceFromNode(queuedTarget.target);
    if (null !== targetInst) {
      var nearestMounted = getNearestMountedFiber(targetInst);
      if (null !== nearestMounted) {
        if (targetInst = nearestMounted.tag, 13 === targetInst) {
          if (targetInst = getSuspenseInstanceFromFiber(nearestMounted), null !== targetInst) {
            queuedTarget.blockedOn = targetInst;
            runWithPriority(queuedTarget.priority, function() {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (31 === targetInst) {
          if (targetInst = getActivityInstanceFromFiber(nearestMounted), null !== targetInst) {
            queuedTarget.blockedOn = targetInst;
            runWithPriority(queuedTarget.priority, function() {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (3 === targetInst && nearestMounted.stateNode.current.memoizedState.isDehydrated) {
          queuedTarget.blockedOn = 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
          return;
        }
      }
    }
    queuedTarget.blockedOn = null;
  }
  function attemptReplayContinuousQueuedEvent(queuedEvent) {
    if (null !== queuedEvent.blockedOn) return false;
    for (var targetContainers = queuedEvent.targetContainers; 0 < targetContainers.length; ) {
      var nextBlockedOn = findInstanceBlockingEvent(queuedEvent.nativeEvent);
      if (null === nextBlockedOn) {
        nextBlockedOn = queuedEvent.nativeEvent;
        var nativeEventClone = new nextBlockedOn.constructor(
          nextBlockedOn.type,
          nextBlockedOn
        );
        currentReplayingEvent = nativeEventClone;
        nextBlockedOn.target.dispatchEvent(nativeEventClone);
        currentReplayingEvent = null;
      } else
        return targetContainers = getInstanceFromNode(nextBlockedOn), null !== targetContainers && attemptContinuousHydration(targetContainers), queuedEvent.blockedOn = nextBlockedOn, false;
      targetContainers.shift();
    }
    return true;
  }
  function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
    attemptReplayContinuousQueuedEvent(queuedEvent) && map.delete(key);
  }
  function replayUnblockedEvents() {
    hasScheduledReplayAttempt = false;
    null !== queuedFocus && attemptReplayContinuousQueuedEvent(queuedFocus) && (queuedFocus = null);
    null !== queuedDrag && attemptReplayContinuousQueuedEvent(queuedDrag) && (queuedDrag = null);
    null !== queuedMouse && attemptReplayContinuousQueuedEvent(queuedMouse) && (queuedMouse = null);
    queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
    queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
  }
  function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
    queuedEvent.blockedOn === unblocked && (queuedEvent.blockedOn = null, hasScheduledReplayAttempt || (hasScheduledReplayAttempt = true, Scheduler.unstable_scheduleCallback(
      Scheduler.unstable_NormalPriority,
      replayUnblockedEvents
    )));
  }
  var lastScheduledReplayQueue = null;
  function scheduleReplayQueueIfNeeded(formReplayingQueue) {
    lastScheduledReplayQueue !== formReplayingQueue && (lastScheduledReplayQueue = formReplayingQueue, Scheduler.unstable_scheduleCallback(
      Scheduler.unstable_NormalPriority,
      function() {
        lastScheduledReplayQueue === formReplayingQueue && (lastScheduledReplayQueue = null);
        for (var i = 0; i < formReplayingQueue.length; i += 3) {
          var form = formReplayingQueue[i], submitterOrAction = formReplayingQueue[i + 1], formData = formReplayingQueue[i + 2];
          if ("function" !== typeof submitterOrAction)
            if (null === findInstanceBlockingTarget(submitterOrAction || form))
              continue;
            else break;
          var formInst = getInstanceFromNode(form);
          null !== formInst && (formReplayingQueue.splice(i, 3), i -= 3, startHostTransition(
            formInst,
            {
              pending: true,
              data: formData,
              method: form.method,
              action: submitterOrAction
            },
            submitterOrAction,
            formData
          ));
        }
      }
    ));
  }
  function retryIfBlockedOn(unblocked) {
    function unblock(queuedEvent) {
      return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
    }
    null !== queuedFocus && scheduleCallbackIfUnblocked(queuedFocus, unblocked);
    null !== queuedDrag && scheduleCallbackIfUnblocked(queuedDrag, unblocked);
    null !== queuedMouse && scheduleCallbackIfUnblocked(queuedMouse, unblocked);
    queuedPointers.forEach(unblock);
    queuedPointerCaptures.forEach(unblock);
    for (var i = 0; i < queuedExplicitHydrationTargets.length; i++) {
      var queuedTarget = queuedExplicitHydrationTargets[i];
      queuedTarget.blockedOn === unblocked && (queuedTarget.blockedOn = null);
    }
    for (; 0 < queuedExplicitHydrationTargets.length && (i = queuedExplicitHydrationTargets[0], null === i.blockedOn); )
      attemptExplicitHydrationTarget(i), null === i.blockedOn && queuedExplicitHydrationTargets.shift();
    i = (unblocked.ownerDocument || unblocked).$$reactFormReplay;
    if (null != i)
      for (queuedTarget = 0; queuedTarget < i.length; queuedTarget += 3) {
        var form = i[queuedTarget], submitterOrAction = i[queuedTarget + 1], formProps = form[internalPropsKey] || null;
        if ("function" === typeof submitterOrAction)
          formProps || scheduleReplayQueueIfNeeded(i);
        else if (formProps) {
          var action = null;
          if (submitterOrAction && submitterOrAction.hasAttribute("formAction"))
            if (form = submitterOrAction, formProps = submitterOrAction[internalPropsKey] || null)
              action = formProps.formAction;
            else {
              if (null !== findInstanceBlockingTarget(form)) continue;
            }
          else action = formProps.action;
          "function" === typeof action ? i[queuedTarget + 1] = action : (i.splice(queuedTarget, 3), queuedTarget -= 3);
          scheduleReplayQueueIfNeeded(i);
        }
      }
  }
  function defaultOnDefaultTransitionIndicator() {
    function handleNavigate(event) {
      event.canIntercept && "react-transition" === event.info && event.intercept({
        handler: function() {
          return new Promise(function(resolve) {
            return pendingResolve = resolve;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function handleNavigateComplete() {
      null !== pendingResolve && (pendingResolve(), pendingResolve = null);
      isCancelled || setTimeout(startFakeNavigation, 20);
    }
    function startFakeNavigation() {
      if (!isCancelled && !navigation.transition) {
        var currentEntry = navigation.currentEntry;
        currentEntry && null != currentEntry.url && navigation.navigate(currentEntry.url, {
          state: currentEntry.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if ("object" === typeof navigation) {
      var isCancelled = false, pendingResolve = null;
      navigation.addEventListener("navigate", handleNavigate);
      navigation.addEventListener("navigatesuccess", handleNavigateComplete);
      navigation.addEventListener("navigateerror", handleNavigateComplete);
      setTimeout(startFakeNavigation, 100);
      return function() {
        isCancelled = true;
        navigation.removeEventListener("navigate", handleNavigate);
        navigation.removeEventListener("navigatesuccess", handleNavigateComplete);
        navigation.removeEventListener("navigateerror", handleNavigateComplete);
        null !== pendingResolve && (pendingResolve(), pendingResolve = null);
      };
    }
  }
  function ReactDOMRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = function(children) {
    var root2 = this._internalRoot;
    if (null === root2) throw Error(formatProdErrorMessage(409));
    var current = root2.current, lane = requestUpdateLane();
    updateContainerImpl(current, lane, children, root2, null, null);
  };
  ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount = function() {
    var root2 = this._internalRoot;
    if (null !== root2) {
      this._internalRoot = null;
      var container = root2.containerInfo;
      updateContainerImpl(root2.current, 2, null, root2, null, null);
      flushSyncWork$1();
      container[internalContainerInstanceKey] = null;
    }
  };
  function ReactDOMHydrationRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = function(target) {
    if (target) {
      var updatePriority = resolveUpdatePriority();
      target = { blockedOn: null, target, priority: updatePriority };
      for (var i = 0; i < queuedExplicitHydrationTargets.length && 0 !== updatePriority && updatePriority < queuedExplicitHydrationTargets[i].priority; i++) ;
      queuedExplicitHydrationTargets.splice(i, 0, target);
      0 === i && attemptExplicitHydrationTarget(target);
    }
  };
  var isomorphicReactPackageVersion$jscomp$inline_1840 = React2.version;
  if ("19.2.5" !== isomorphicReactPackageVersion$jscomp$inline_1840)
    throw Error(
      formatProdErrorMessage(
        527,
        isomorphicReactPackageVersion$jscomp$inline_1840,
        "19.2.5"
      )
    );
  ReactDOMSharedInternals.findDOMNode = function(componentOrElement) {
    var fiber = componentOrElement._reactInternals;
    if (void 0 === fiber) {
      if ("function" === typeof componentOrElement.render)
        throw Error(formatProdErrorMessage(188));
      componentOrElement = Object.keys(componentOrElement).join(",");
      throw Error(formatProdErrorMessage(268, componentOrElement));
    }
    componentOrElement = findCurrentFiberUsingSlowPath(fiber);
    componentOrElement = null !== componentOrElement ? findCurrentHostFiberImpl(componentOrElement) : null;
    componentOrElement = null === componentOrElement ? null : componentOrElement.stateNode;
    return componentOrElement;
  };
  var internals$jscomp$inline_2347 = {
    bundleType: 0,
    version: "19.2.5",
    rendererPackageName: "react-dom",
    currentDispatcherRef: ReactSharedInternals,
    reconcilerVersion: "19.2.5"
  };
  if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
    var hook$jscomp$inline_2348 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook$jscomp$inline_2348.isDisabled && hook$jscomp$inline_2348.supportsFiber)
      try {
        rendererID = hook$jscomp$inline_2348.inject(
          internals$jscomp$inline_2347
        ), injectedHook = hook$jscomp$inline_2348;
      } catch (err) {
      }
  }
  reactDomClient_production.createRoot = function(container, options2) {
    if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
    var isStrictMode = false, identifierPrefix = "", onUncaughtError = defaultOnUncaughtError, onCaughtError = defaultOnCaughtError, onRecoverableError = defaultOnRecoverableError;
    null !== options2 && void 0 !== options2 && (true === options2.unstable_strictMode && (isStrictMode = true), void 0 !== options2.identifierPrefix && (identifierPrefix = options2.identifierPrefix), void 0 !== options2.onUncaughtError && (onUncaughtError = options2.onUncaughtError), void 0 !== options2.onCaughtError && (onCaughtError = options2.onCaughtError), void 0 !== options2.onRecoverableError && (onRecoverableError = options2.onRecoverableError));
    options2 = createFiberRoot(
      container,
      1,
      false,
      null,
      null,
      isStrictMode,
      identifierPrefix,
      null,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      defaultOnDefaultTransitionIndicator
    );
    container[internalContainerInstanceKey] = options2.current;
    listenToAllSupportedEvents(container);
    return new ReactDOMRoot(options2);
  };
  reactDomClient_production.hydrateRoot = function(container, initialChildren, options2) {
    if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
    var isStrictMode = false, identifierPrefix = "", onUncaughtError = defaultOnUncaughtError, onCaughtError = defaultOnCaughtError, onRecoverableError = defaultOnRecoverableError, formState = null;
    null !== options2 && void 0 !== options2 && (true === options2.unstable_strictMode && (isStrictMode = true), void 0 !== options2.identifierPrefix && (identifierPrefix = options2.identifierPrefix), void 0 !== options2.onUncaughtError && (onUncaughtError = options2.onUncaughtError), void 0 !== options2.onCaughtError && (onCaughtError = options2.onCaughtError), void 0 !== options2.onRecoverableError && (onRecoverableError = options2.onRecoverableError), void 0 !== options2.formState && (formState = options2.formState));
    initialChildren = createFiberRoot(
      container,
      1,
      true,
      initialChildren,
      null != options2 ? options2 : null,
      isStrictMode,
      identifierPrefix,
      formState,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      defaultOnDefaultTransitionIndicator
    );
    initialChildren.context = getContextForSubtree(null);
    options2 = initialChildren.current;
    isStrictMode = requestUpdateLane();
    isStrictMode = getBumpedLaneForHydrationByLane(isStrictMode);
    identifierPrefix = createUpdate(isStrictMode);
    identifierPrefix.callback = null;
    enqueueUpdate(options2, identifierPrefix, isStrictMode);
    options2 = isStrictMode;
    initialChildren.current.lanes = options2;
    markRootUpdated$1(initialChildren, options2);
    ensureRootIsScheduled(initialChildren);
    container[internalContainerInstanceKey] = initialChildren.current;
    listenToAllSupportedEvents(container);
    return new ReactDOMHydrationRoot(initialChildren);
  };
  reactDomClient_production.version = "19.2.5";
  return reactDomClient_production;
}
var hasRequiredClient;
function requireClient() {
  if (hasRequiredClient) return client.exports;
  hasRequiredClient = 1;
  function checkDCE() {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
      return;
    }
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
      console.error(err);
    }
  }
  {
    checkDCE();
    client.exports = requireReactDomClient_production();
  }
  return client.exports;
}
var clientExports = requireClient();
const ReactDOM = /* @__PURE__ */ getDefaultExportFromCjs(clientExports);
const scriptRel = /* @__PURE__ */ (function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
})();
const assetsURL = function(dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled2 = function(promises) {
      return Promise.all(
        promises.map(
          (p) => Promise.resolve(p).then(
            (value) => ({ status: "fulfilled", value }),
            (reason) => ({ status: "rejected", reason })
          )
        )
      );
    };
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled2(
      deps.map((dep) => {
        dep = assetsURL(dep, importerUrl);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        const isBaseRelative = !!importerUrl;
        if (isBaseRelative) {
          for (let i = links.length - 1; i >= 0; i--) {
            const link2 = links[i];
            if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
              return;
            }
          }
        } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
const HISTORY_CHAR_BUDGET = 2e4;
const HISTORY_MAX_MESSAGES = 40;
function buildTokenBudgetedHistory(messages, opts = {}) {
  const charBudget = opts.charBudget ?? HISTORY_CHAR_BUDGET;
  const maxMessages = opts.maxMessages ?? HISTORY_MAX_MESSAGES;
  const taskOnly = opts.taskOnly ?? false;
  const eligible = messages.filter((m) => m.role === "user" || m.role === "assistant").filter((m) => !taskOnly || m.isTask === true || m.role === "user").map((m) => ({ ...m, content: historyContentFor(m) })).filter((m) => m.content.trim().length > 0);
  let remainingBudget = charBudget;
  const selected = [];
  for (let i = eligible.length - 1; i >= 0; i--) {
    if (selected.length >= maxMessages) break;
    const m = eligible[i];
    const chars = m.content.length;
    if (remainingBudget - chars < 0 && selected.length > 0) break;
    selected.unshift({ role: m.role, content: m.content });
    remainingBudget -= chars;
  }
  return selected;
}
function structuredMessageToHistoryText(message) {
  if (message.kind === "plan_result") {
    return [
      `Plan created: ${message.objective}`,
      message.files.length ? `Files: ${message.files.map((file) => `${file.path}${file.reason ? ` (${file.reason})` : ""}`).join(", ")}` : "",
      message.approach ? `Approach: ${message.approach}` : "",
      message.validations.length ? `Validations: ${message.validations.join(", ")}` : "",
      `Risk: ${message.risk}`
    ].filter(Boolean).join("\n");
  }
  const changed = message.filesChanged.map((file) => `${file.path} (${file.status})`).join(", ");
  const validations = message.validations.map((v) => `${v.command}: ${v.status}`).join(", ");
  return [
    `${message.title}: ${message.summary}`,
    changed ? `Files changed: ${changed}` : "Files changed: none",
    validations ? `Validations: ${validations}` : "",
    message.notes.length ? `Notes: ${message.notes.join(" ")}` : "",
    `Decision: ${message.decision}; risk: ${message.risk}`
  ].filter(Boolean).join("\n");
}
function historyContentFor(message) {
  if (message.structured) return structuredMessageToHistoryText(message.structured);
  const content = message.content.trim();
  if (content) return content;
  return "";
}
let messageSeq = 0;
function createChatMessageId(prefix = "msg") {
  messageSeq += 1;
  return `${prefix}-${Date.now()}-${messageSeq}`;
}
const _EMPTY_REASONING = {
  active: false,
  text: "",
  startedAt: null,
  endedAt: null
};
function historyTextForStreamEnd(streamingText, structured) {
  if (structured) return structuredMessageToHistoryText(structured);
  return streamingText.trim();
}
function useEngineEvents(setState) {
  reactExports.useEffect(() => {
    window.kova.getSettings().then((s) => {
      setState((prev) => ({ ...prev, settings: s }));
      const provider = s.defaultProvider;
      const url = provider === "ollama" ? s.ollamaUrl : provider === "lmstudio" || provider === "openai-compatible" ? s.compatibleUrl : null;
      if (url) {
        window.kova.detectModel(url).then((m) => {
          if (m) setState((prev) => ({ ...prev, activeModel: m, modelConnected: true }));
        });
      }
    });
    const unsubs = [
      window.kova.onStateUpdate(
        (executionState) => setState((prev) => {
          const finished = ["completed", "failed", "paused"].includes(executionState.status);
          const shouldRefresh = ["validating", "applying", "completed", "paused", "failed"].includes(executionState.status) && !["validating", "applying", "completed", "paused", "failed"].includes(prev.executionState?.status ?? "");
          return {
            ...prev,
            executionState,
            isThinking: finished ? false : prev.isThinking,
            reasoning: finished ? _EMPTY_REASONING : prev.reasoning,
            fileRefreshKey: shouldRefresh ? prev.fileRefreshKey + 1 : prev.fileRefreshKey
          };
        })
      ),
      window.kova.onTaskStructured((task) => setState((prev) => ({ ...prev, task }))),
      window.kova.onError((msg) => setState((prev) => ({
        ...prev,
        isThinking: false,
        reasoning: _EMPTY_REASONING,
        messages: [...prev.messages, { id: createChatMessageId("assistant"), role: "assistant", content: msg, isTask: false }]
      }))),
      window.kova.onModelDetected((model) => setState((prev) => ({ ...prev, activeModel: model, modelConnected: true }))),
      window.kova.onChatResponse((msg) => setState((prev) => {
        const last = prev.messages[prev.messages.length - 1];
        if (last?.role === "assistant" && last.content.trim() === msg.trim()) {
          return { ...prev, isThinking: false, reasoning: _EMPTY_REASONING };
        }
        return {
          ...prev,
          isThinking: false,
          reasoning: _EMPTY_REASONING,
          messages: [...prev.messages, { id: createChatMessageId("assistant"), role: "assistant", content: msg, isTask: false }]
        };
      })),
      window.kova.onExecutionEvent((event) => setState((prev) => {
        if (event.type === "context_loaded" && event.context) {
          return {
            ...prev,
            sessionUsage: {
              contextTokens: event.context.tokensUsed,
              completionTokens: prev.sessionUsage.completionTokens,
              cacheReadInputTokens: prev.sessionUsage.cacheReadInputTokens ?? 0,
              cacheCreationInputTokens: prev.sessionUsage.cacheCreationInputTokens ?? 0,
              contextFiles: event.context.files,
              selectedFiles: event.context.selectedFiles ?? [],
              blockedFiles: event.context.blockedFiles ?? [],
              rejectedFiles: event.context.rejectedFiles ?? [],
              contextWarnings: event.context.warnings ?? [],
              learningsCount: event.context.learningsCount ?? 0,
              maxContextTokens: event.context.maxTokens ?? null
            },
            executionEvents: [...prev.executionEvents, event].slice(-200)
          };
        }
        if (event.type === "token_usage") {
          const usageEvent = event;
          return {
            ...prev,
            sessionUsage: {
              ...prev.sessionUsage,
              completionTokens: prev.sessionUsage.completionTokens + (event.tokensUsed ?? 0),
              cacheReadInputTokens: (prev.sessionUsage.cacheReadInputTokens ?? 0) + (usageEvent.cacheReadInputTokens ?? usageEvent.usage?.cacheReadInputTokens ?? 0),
              cacheCreationInputTokens: (prev.sessionUsage.cacheCreationInputTokens ?? 0) + (usageEvent.cacheCreationInputTokens ?? usageEvent.usage?.cacheCreationInputTokens ?? 0)
            },
            executionEvents: [...prev.executionEvents, event].slice(-200)
          };
        }
        if (event.type === "token" && event.token) {
          return {
            ...prev,
            reasoning: { ...prev.reasoning, active: false, endedAt: Date.now() },
            streamingText: prev.streamingText + event.token,
            executionEvents: [...prev.executionEvents, event].slice(-160)
          };
        }
        if (event.type === "reasoning_start") {
          return {
            ...prev,
            reasoning: {
              active: true,
              text: prev.reasoning.text,
              startedAt: prev.reasoning.active ? prev.reasoning.startedAt : Date.now(),
              endedAt: null
            },
            executionEvents: [...prev.executionEvents, event].slice(-160)
          };
        }
        if (event.type === "reasoning_delta" && event.reasoning) {
          return {
            ...prev,
            reasoning: {
              active: true,
              text: (prev.reasoning.text + event.reasoning).slice(-4e3),
              startedAt: prev.reasoning.startedAt ?? Date.now(),
              endedAt: null
            },
            executionEvents: [...prev.executionEvents, event].slice(-160)
          };
        }
        if (event.type === "reasoning_end") {
          return {
            ...prev,
            reasoning: { ...prev.reasoning, active: false, endedAt: Date.now() },
            executionEvents: [...prev.executionEvents, event].slice(-160)
          };
        }
        if (event.type === "provider_error") {
          return {
            ...prev,
            streamingText: "",
            reasoning: _EMPTY_REASONING,
            isThinking: false,
            executionState: null,
            executionEvents: [...prev.executionEvents, event].slice(-200)
          };
        }
        if (event.type === "provider_session_start") {
          return {
            ...prev,
            executionEvents: [...prev.executionEvents, event].slice(-200)
          };
        }
        if (event.type === "stream_end") {
          const structured = event.structuredMessage;
          const historyText = historyTextForStreamEnd(prev.streamingText, structured);
          const assistantMsg = {
            id: createChatMessageId("assistant"),
            role: "assistant",
            content: historyText,
            isTask: !!structured,
            structured
          };
          const newMessages = historyText || structured ? [...prev.messages, assistantMsg] : prev.messages;
          return {
            ...prev,
            streamingText: "",
            reasoning: _EMPTY_REASONING,
            isThinking: false,
            messages: newMessages,
            executionEvents: [...prev.executionEvents, event].slice(-160)
          };
        }
        if (event.type === "proof_pack" && event.proofPack) {
          return {
            ...prev,
            executionState: prev.executionState ? { ...prev.executionState, proofPack: event.proofPack } : prev.executionState,
            executionEvents: [...prev.executionEvents, event].slice(-200)
          };
        }
        if (event.type === "todos_updated") {
          return {
            ...prev,
            todos: event.todos ?? [],
            executionEvents: [...prev.executionEvents, event].slice(-200)
          };
        }
        const isFileMutation = event.type === "tool_call" && (event.toolName === "write_file" || event.toolName === "delete_file");
        const shouldRefresh = isFileMutation || event.type === "file_mutation" || event.type === "apply_completed";
        return {
          ...prev,
          executionEvents: [...prev.executionEvents, event].slice(-200),
          fileRefreshKey: shouldRefresh ? prev.fileRefreshKey + 1 : prev.fileRefreshKey
        };
      }))
    ];
    return () => unsubs.forEach((u) => u());
  }, [setState]);
}
function useSessionPersistence(opts) {
  const {
    projectRoot,
    messages,
    isThinking,
    sessionId,
    task,
    sessionUsage,
    executionState,
    executionEvents,
    todos,
    onSessionIdCreated
  } = opts;
  const onCreatedRef = reactExports.useRef(onSessionIdCreated);
  onCreatedRef.current = onSessionIdCreated;
  reactExports.useEffect(() => {
    if (!projectRoot || messages.length === 0 || isThinking) return;
    const id = sessionId || Date.now().toString();
    if (!sessionId) onCreatedRef.current(id);
    const title = messages.find((m) => m.role === "user")?.content.slice(0, 30) || "New Session";
    const session = {
      id,
      title,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      messages,
      task,
      sessionUsage,
      executionState,
      events: executionEvents,
      todos
    };
    window.kova.saveSession(projectRoot, session).catch(console.error);
  }, [messages, isThinking, executionState, sessionUsage, projectRoot, sessionId, task, executionEvents, todos]);
}
const SLASH_PATTERN = /^\/(plan|review|chat)\b\s*/i;
function parseUserInput(raw, defaultMode, attachments) {
  const trimmed = raw.trim();
  const match = SLASH_PATTERN.exec(trimmed);
  if (match) {
    const stripped = trimmed.slice(match[0].length).trim();
    return {
      // Preserve the slash command itself when there's no body — model still gets context
      text: stripped || trimmed,
      mode: match[1].toLowerCase(),
      fromSlashCommand: true,
      attachments
    };
  }
  return {
    text: trimmed,
    mode: defaultMode,
    fromSlashCommand: false,
    attachments
  };
}
var VISION_PATTERNS = [
  // Anthropic Claude 3.5+ — all current and recent models are multimodal
  /\bclaude-(opus|sonnet|haiku)-[34]/i,
  /\bclaude-3-5/i,
  // Google Gemini — all 2.x and 3.x are multimodal
  /\bgemini-3/i,
  /\bgemini-2\.5/i,
  // OpenAI GPT-4o / GPT-4.1 / GPT-5.x (full and mini/pro tiers)
  /\bgpt-4(o|\.1)/i,
  /\bgpt-5(\.\d+)?(-pro|-mini)?\b/i,
  /\bo[1-9](-mini|-pro)?/i,
  // xAI Grok 4.x is multimodal
  /\bgrok-(4|3|code-fast)/i,
  /\bx-ai\/grok/i,
  // Dedicated VL (vision-language) variants of open-source families
  /\bdeepseek-vl/i,
  /\bkimi-k2(\.\d+)?(-vl|-vision)/i,
  /\bqwen2\.5-vl/i
];
var TEXT_ONLY_OVERRIDES = [
  // OpenAI coding/nano variants are text-only despite the GPT-5.x prefix.
  /\bgpt-5(\.\d+)?-codex/i,
  /\bgpt-5(\.\d+)?-nano/i
];
function detectVisionSupport(modelId) {
  if (!modelId) return false;
  if (TEXT_ONLY_OVERRIDES.some((rx) => rx.test(modelId))) return false;
  return VISION_PATTERNS.some((rx) => rx.test(modelId));
}
function serverUrl$1(s) {
  if (s.defaultProvider === "ollama") return s.ollamaUrl;
  if (s.defaultProvider === "lmstudio" || s.defaultProvider === "openai-compatible") return s.compatibleUrl;
  return "";
}
const PROVIDER_LABEL = {
  lmstudio: "LM Studio",
  ollama: "Ollama",
  anthropic: "Anthropic",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
  "openai-compatible": "Compatible"
};
function ModelPicker({ settings, activeModel, onSelect, onOpenSettings, onClose, anchorRef }) {
  const [models, setModels] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState("");
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, anchorRef]);
  reactExports.useEffect(() => {
    const url2 = serverUrl$1(settings);
    setLoading(true);
    setError("");
    setModels([]);
    if (!url2) {
      setLoading(false);
      return;
    }
    fetch(`${url2.replace(/\/+$/, "")}/models`, { signal: AbortSignal.timeout(4e3) }).then((r) => r.json()).then((data) => {
      const ids = (data.data ?? []).map((m) => m.id).filter(Boolean);
      setModels(ids.map((id) => ({ id, active: id === activeModel })));
      if (ids.length === 0) setError("Servidor ativo, mas nenhum modelo foi encontrado.");
    }).catch(() => setError("Servidor nao responde. Verifique se esta rodando.")).finally(() => setLoading(false));
  }, [settings, activeModel]);
  const isLocal = ["lmstudio", "ollama", "openai-compatible"].includes(settings.defaultProvider);
  const url = serverUrl$1(settings);
  const providerLabel = PROVIDER_LABEL[settings.defaultProvider] ?? settings.defaultProvider;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref, className: "kova-model-picker animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-model-picker-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Provider" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: providerLabel })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: isLocal ? "online" : "cloud", children: isLocal ? "local" : "cloud" })
    ] }),
    url && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-model-picker-url", children: url }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-model-picker-state", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-model-spinner" }),
      "Detectando modelos"
    ] }),
    !loading && error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-model-picker-error", children: error }),
    !loading && !error && models.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-model-list", role: "listbox", children: models.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        role: "option",
        "aria-selected": m.active,
        className: `kova-model-option${m.active ? " active" : ""}`,
        onClick: () => {
          onSelect(m.id);
          onClose();
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-model-dot" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: m.id }),
          m.active && /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "ativo" })
        ]
      },
      m.id
    )) }),
    !isLocal && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-model-cloud-model", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Modelo configurado" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: settings.model || "modelo padrao do provider" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onOpenSettings, className: "kova-model-settings", children: "Abrir configuracoes" })
  ] });
}
const kovaLogo = "" + new URL("Logo_Kova-BkEnlz01.png", import.meta.url).href;
const STATUS_COLOR$1 = {
  structuring: "var(--amber)",
  planning: "var(--amber)",
  coding: "var(--amber)",
  validating: "var(--yellow)",
  deciding: "var(--yellow)",
  applying: "var(--teal)",
  completed: "var(--teal)",
  failed: "var(--red)",
  paused: "var(--text-3)"
};
const isActive = (s) => s && !["completed", "failed", "paused"].includes(s);
const isMac = window.kova?.platform === "darwin";
function TitleBar({ projectRoot, status, settings, activeModel, modelConnected, onOpenFolder, onOpenSettings, onSelectModel }) {
  const [showPicker, setShowPicker] = reactExports.useState(false);
  const modelBtnRef = reactExports.useRef(null);
  const projectName = projectRoot?.split(/[/\\]/).at(-1) ?? null;
  const modelLabel = activeModel ? activeModel.split("/").at(-1)?.replace(/[-_](instruct|chat|hf|gguf|q\d.*)$/i, "") ?? activeModel : "sem modelo";
  const dotColor = modelConnected ? "var(--teal)" : settings ? "var(--red)" : "var(--text-ghost)";
  const dragStyle = {
    height: 40,
    background: "var(--bg-3)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    paddingLeft: isMac ? 80 : 12,
    paddingRight: 8,
    WebkitAppRegion: "drag",
    flexShrink: 0,
    position: "relative"
  };
  const noDragStyle = { WebkitAppRegion: "no-drag" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { ...dragStyle, justifyContent: "space-between" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", alignItems: "center", flex: 1, minWidth: 0, ...noDragStyle }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onOpenFolder, style: {
      background: "transparent",
      color: projectName ? "var(--text-1)" : "var(--text-3)",
      padding: "4px 8px",
      fontSize: 12,
      fontWeight: projectName ? 600 : 400,
      maxWidth: 250,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 6
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 16, color: projectName ? "var(--cyan)" : "var(--text-3)" }, children: "folder_open" }),
      projectName ? projectName : "Abrir projeto"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "img",
        {
          src: kovaLogo,
          alt: "",
          "aria-hidden": "true",
          style: {
            width: 24,
            height: 24,
            objectFit: "contain",
            filter: "invert(1) brightness(0.92) drop-shadow(0 0 10px rgba(116, 211, 255, 0.22))",
            opacity: 0.9
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 800, fontSize: 14, letterSpacing: "0.15em", color: "var(--cyan)" }, children: "KOVA" }),
      status && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        flexShrink: 0,
        background: STATUS_COLOR$1[status] ?? "var(--text-3)",
        animation: isActive(status) ? "pulse-amber 1.5s infinite" : "none"
      } })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, flex: 1, ...noDragStyle }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            ref: modelBtnRef,
            onClick: () => setShowPicker((v) => !v),
            style: {
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: showPicker ? "var(--bg-active)" : "transparent",
              border: `1px solid ${showPicker ? "var(--border-focus)" : "transparent"}`,
              borderRadius: 6,
              padding: "4px 10px",
              color: "var(--text-2)",
              fontSize: 12,
              transition: "all 0.15s",
              cursor: "pointer"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: dotColor,
                flexShrink: 0,
                animation: modelConnected && isActive(status) ? "pulse-amber 1.5s infinite" : "none",
                boxShadow: modelConnected ? `0 0 8px ${dotColor}` : "none"
              } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: modelLabel })
            ]
          }
        ),
        showPicker && settings && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ModelPicker,
          {
            settings,
            activeModel,
            onSelect: (m) => {
              onSelectModel(m);
              setShowPicker(false);
            },
            onOpenSettings: () => {
              onOpenSettings();
              setShowPicker(false);
            },
            onClose: () => setShowPicker(false),
            anchorRef: modelBtnRef
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onOpenSettings, style: { background: "transparent", color: "var(--text-3)", padding: "4px 8px", fontSize: 14 }, title: "Settings", children: "⚙" }),
      !isMac && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 1, height: 16, background: "var(--border)", margin: "0 4px" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => window.kova.windowMinimize(), style: { background: "transparent", color: "var(--text-3)", padding: "4px 10px" }, children: "─" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => window.kova.windowMaximize(), style: { background: "transparent", color: "var(--text-3)", padding: "4px 10px" }, children: "□" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => window.kova.windowClose(), style: { background: "transparent", color: "var(--text-3)", padding: "4px 10px" }, children: "✕" })
      ] })
    ] })
  ] });
}
const EXT_COLOR = {
  go: "#00ADD8",
  ts: "#3178C6",
  tsx: "#61DAFB",
  js: "#F7DF1E",
  jsx: "#61DAFB",
  py: "#3776AB",
  rs: "#CE422B",
  java: "#ED8B00",
  cs: "#239120",
  rb: "#CC342D",
  php: "#777BB4",
  swift: "#FA7343",
  kt: "#7F52FF",
  cpp: "#004283",
  c: "#A8B9CC",
  json: "#5DCAA5",
  yaml: "#E5C07B",
  yml: "#E5C07B",
  toml: "#9C4121",
  md: "#7F77DD",
  html: "#E44D26",
  css: "#264DE4",
  sh: "#89E051",
  bash: "#89E051",
  mod: "#00ADD8",
  sum: "#00ADD8",
  sql: "#CC2927",
  lock: "#5DCAA5"
};
const EXT_LANG = {
  go: "Go",
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  rs: "Rust",
  java: "Java",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  cpp: "C++",
  c: "C",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  md: "Markdown",
  html: "HTML",
  css: "CSS",
  sh: "Shell",
  bash: "Shell",
  sql: "SQL",
  mod: "Go mod",
  sum: "Go sum",
  lock: "Lockfile"
};
const SPECIAL_FILES = {
  dockerfile: { label: "DOC", color: "#2496ED" },
  makefile: { label: "MK", color: "#427819" },
  ".gitignore": { label: "GIT", color: "#F05032" },
  ".gitattributes": { label: "GIT", color: "#F05032" },
  ".env": { label: "ENV", color: "#89E051" },
  ".envrc": { label: "ENV", color: "#89E051" },
  "cargo.toml": { label: "CARG", color: "#CE422B" },
  "cargo.lock": { label: "LOCK", color: "#CE422B" },
  "go.sum": { label: "SUM", color: "#00ADD8" },
  "package.json": { label: "PKG", color: "#F7DF1E" },
  "tsconfig.json": { label: "TSC", color: "#3178C6" }
};
function fileIconInfo(name) {
  const lower = name.toLowerCase();
  const special = SPECIAL_FILES[lower];
  if (special) return special;
  if (lower.startsWith(".env")) return { label: "ENV", color: "#89E051" };
  const e = lower.split(".").at(-1) ?? "";
  if (!e || e === lower) return { label: "?", color: "var(--text-3)" };
  return {
    label: e.toUpperCase().slice(0, 3),
    color: EXT_COLOR[e] ?? "var(--text-3)"
  };
}
function getExt(path) {
  const name = path.replace(/\\/g, "/").split("/").at(-1) ?? "";
  return name.split(".").at(-1)?.toLowerCase() ?? "";
}
function getFileName(path) {
  return path.replace(/\\/g, "/").split("/").at(-1) ?? path;
}
function getFolder(path) {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}
function hasChangedDescendant(node, changedPaths) {
  if (!node.isDir) return changedPaths.has(node.path);
  return (node.children ?? []).some((c) => hasChangedDescendant(c, changedPaths));
}
function NodeRow({ node, depth, changedPaths, onOpenFile }) {
  const [open, setOpen] = reactExports.useState(depth === 0);
  const isChanged = !node.isDir && changedPaths.has(node.path);
  const isProtected = !!node.protected;
  const childChanged = node.isDir && hasChangedDescendant(node, changedPaths);
  const icon = !node.isDir ? fileIconInfo(node.name) : { label: "", color: "" };
  const nameColor = isChanged ? "var(--teal)" : childChanged ? "var(--amber)" : isProtected ? "var(--yellow)" : node.isDir ? "var(--text-2)" : "var(--text-1)";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        onClick: () => node.isDir ? setOpen((v) => !v) : onOpenFile(node.path),
        style: { display: "flex", alignItems: "center", gap: 5, height: 22, paddingLeft: 6 + depth * 12, paddingRight: 10, cursor: "pointer", userSelect: "none", background: isChanged ? "rgba(93,202,165,0.04)" : "transparent" },
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = isChanged ? "rgba(93,202,165,0.04)" : "transparent";
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { width: 14, fontSize: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: childChanged ? "var(--amber)" : "var(--text-ghost)", transition: "transform 0.15s ease", transform: node.isDir ? open ? "rotate(0deg)" : "rotate(-90deg)" : "none" }, children: node.isDir ? "▾" : "" }),
          node.isDir ? /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", style: { flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "path",
            {
              d: "M1 3.5C1 2.94 1.45 2.5 2 2.5H5.5L7 4H12C12.55 4 13 4.45 13 5V10.5C13 11.05 12.55 11.5 12 11.5H2C1.45 11.5 1 11.05 1 10.5V3.5Z",
              fill: childChanged ? "rgba(193,122,46,0.25)" : "rgba(255,255,255,0.06)",
              stroke: childChanged ? "var(--amber)" : "var(--text-ghost)",
              strokeWidth: "0.6"
            }
          ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 16, height: 16, borderRadius: 2, flexShrink: 0, background: `${icon.color}22`, border: `1px solid ${icon.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 900, color: icon.color, letterSpacing: "-0.03em" }, children: icon.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: nameColor, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: node.name }),
          isProtected && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: "Protected file", style: { color: "var(--yellow)", fontSize: 10, flexShrink: 0 }, children: "lock" }),
          (isChanged || childChanged) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 5, height: 5, borderRadius: "50%", background: isChanged ? "var(--teal)" : "var(--amber)", flexShrink: 0 } })
        ]
      }
    ),
    node.isDir && open && node.children?.map((child) => /* @__PURE__ */ jsxRuntimeExports.jsx(NodeRow, { node: child, depth: depth + 1, changedPaths, onOpenFile }, child.path))
  ] });
}
function ProjectFiles({ projectRoot, changedPaths, onOpenFile, refreshKey }) {
  const [tree, setTree] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const refresh = reactExports.useCallback(() => {
    setLoading(true);
    window.kova.listDir(projectRoot).then((nodes) => setTree(nodes)).catch(() => setTree([])).finally(() => setLoading(false));
  }, [projectRoot]);
  reactExports.useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflow: "auto", paddingBottom: 8 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 4px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }, children: "Files" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: refresh, style: { background: "transparent", color: "var(--text-3)", padding: "2px 4px", fontSize: 13, lineHeight: 1 }, title: "Refresh", children: "⟳" })
    ] }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--text-3)", padding: "6px 14px" }, children: "Carregando..." }),
    !loading && tree.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--text-ghost)", padding: "6px 14px" }, children: "Pasta vazia" }),
    tree.map((node) => /* @__PURE__ */ jsxRuntimeExports.jsx(NodeRow, { node, depth: 0, changedPaths, onOpenFile }, node.path))
  ] });
}
function MemoryPanel({ projectRoot, refreshKey }) {
  const [pending, setPending] = reactExports.useState([]);
  const [contradicted, setContradicted] = reactExports.useState([]);
  const [invalidated, setInvalidated] = reactExports.useState([]);
  const [expanded, setExpanded] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!projectRoot) {
      setPending([]);
      setContradicted([]);
      setInvalidated([]);
      return;
    }
    Promise.all([
      window.kova.getPendingLearnings(projectRoot).catch(() => []),
      window.kova.getContradictedLearnings(projectRoot).catch(() => []),
      window.kova.getInvalidatedLearnings(projectRoot).catch(() => [])
    ]).then(([p, c, i]) => {
      setPending(p);
      setContradicted(c);
      setInvalidated(i);
    });
  }, [projectRoot, refreshKey]);
  const total = pending.length + contradicted.length + invalidated.length;
  if (!projectRoot || total === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    padding: "8px 12px",
    borderTop: "1px solid var(--border)",
    background: "var(--bg-2)",
    fontSize: 12
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setExpanded((v) => !v),
        style: {
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          color: "var(--text-2)",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          cursor: "pointer",
          padding: "4px 0"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Memory" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 6 }, children: [
            pending.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 8,
              fontFamily: "var(--font-mono)",
              background: "var(--yellow-dim)",
              color: "var(--yellow)"
            }, children: [
              pending.length,
              " review"
            ] }),
            contradicted.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 8,
              fontFamily: "var(--font-mono)",
              background: "var(--red-dim)",
              color: "var(--red)"
            }, children: [
              contradicted.length,
              " conflict"
            ] }),
            invalidated.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 8,
              fontFamily: "var(--font-mono)",
              background: "var(--bg-active)",
              color: "var(--text-3)"
            }, children: [
              invalidated.length,
              " invalid"
            ] })
          ] })
        ]
      }
    ),
    expanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }, children: [
      pending.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(PendingSection, { items: pending }),
      contradicted.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ContradictedSection, { items: contradicted }),
      invalidated.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(InvalidatedSection, { items: invalidated })
    ] })
  ] });
}
function InvalidatedSection({ items }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "var(--text-3)", marginBottom: 4 }, children: "Invalidated learnings" }),
    items.slice(0, 5).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      padding: "6px 8px",
      borderRadius: 6,
      background: "var(--bg-3)",
      marginBottom: 4,
      border: "1px solid var(--border)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-1)", fontSize: 12, lineHeight: 1.4 }, children: item.description.slice(0, 140) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-3)", fontSize: 10, marginTop: 2 }, children: item.invalidationReason ?? "Invalidated by project profile change." })
    ] }, item.id))
  ] });
}
function PendingSection({ items }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "var(--text-3)", marginBottom: 4 }, children: "Awaiting human review" }),
    items.slice(0, 5).map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      padding: "6px 8px",
      borderRadius: 6,
      background: "var(--bg-3)",
      marginBottom: 4,
      border: "1px solid var(--border)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--yellow-dim)", color: "var(--yellow)", fontFamily: "var(--font-mono)" }, children: item.type }),
        item.stack && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--bg-active)", color: "var(--text-3)", fontFamily: "var(--font-mono)" }, children: item.stack })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-1)", fontSize: 12, lineHeight: 1.4 }, children: item.candidateDescription.slice(0, 140) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-3)", fontSize: 10, marginTop: 2 }, children: item.reason })
    ] }, i)),
    items.length > 5 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "var(--text-3)", textAlign: "center", marginTop: 2 }, children: [
      "+",
      items.length - 5,
      " pending"
    ] })
  ] });
}
function ContradictedSection({ items }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "var(--text-3)", marginBottom: 4 }, children: "Contradicted learnings" }),
    items.slice(0, 5).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      padding: "6px 8px",
      borderRadius: 6,
      background: "var(--bg-3)",
      marginBottom: 4,
      border: "1px solid var(--red-dim)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--red-dim)", color: "var(--red)", fontFamily: "var(--font-mono)" }, children: [
          item.contradictions,
          " × contradiction"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--bg-active)", color: "var(--text-3)", fontFamily: "var(--font-mono)" }, children: item.status })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-1)", fontSize: 12, lineHeight: 1.4 }, children: item.description.slice(0, 140) })
    ] }, item.id)),
    items.length > 5 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "var(--text-3)", textAlign: "center", marginTop: 2 }, children: [
      "+",
      items.length - 5,
      " contradicted"
    ] })
  ] });
}
function Sidebar({ executionState, projectRoot, sessionUsage, changedPaths, refreshKey, onOpenFile, onLoadSession }) {
  const [tab, setTab] = reactExports.useState("files");
  const [sessions, setSessions] = reactExports.useState([]);
  const history = executionState?.iterationHistory ?? [];
  const totalTokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens);
  const contextPercent = sessionUsage.maxContextTokens ? Math.min(100, Math.round(sessionUsage.contextTokens / sessionUsage.maxContextTokens * 100)) : 0;
  reactExports.useEffect(() => {
    if (tab === "sessions" && projectRoot) {
      window.kova.listSessions(projectRoot).then(setSessions);
    }
  }, [tab, projectRoot]);
  const filesTabStyle = reactExports.useMemo(() => ({
    flex: 1,
    padding: "7px 0",
    background: "transparent",
    display: "flex",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    color: tab === "files" ? "var(--text-1)" : "var(--text-3)",
    borderBottom: tab === "files" ? "2px solid var(--cyan)" : "2px solid transparent",
    fontSize: 11,
    fontWeight: tab === "files" ? 600 : 400,
    borderRadius: 0,
    transition: "color 0.15s"
  }), [tab]);
  const historyTabStyle = reactExports.useMemo(() => ({
    flex: 1,
    padding: "7px 0",
    background: "transparent",
    display: "flex",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    color: tab === "history" ? "var(--text-1)" : "var(--text-3)",
    borderBottom: tab === "history" ? "2px solid var(--cyan)" : "2px solid transparent",
    fontSize: 11,
    fontWeight: tab === "history" ? 600 : 400,
    borderRadius: 0,
    transition: "color 0.15s"
  }), [tab]);
  const sessionsTabStyle = reactExports.useMemo(() => ({
    flex: 1,
    padding: "7px 0",
    background: "transparent",
    display: "flex",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    color: tab === "sessions" ? "var(--text-1)" : "var(--text-3)",
    borderBottom: tab === "sessions" ? "2px solid var(--cyan)" : "2px solid transparent",
    fontSize: 11,
    fontWeight: tab === "sessions" ? 600 : 400,
    borderRadius: 0,
    transition: "color 0.15s"
  }), [tab]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 220, background: "var(--bg-2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }, children: [
    projectRoot && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 12px 6px", borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", marginBottom: 4 }, children: "EXPLORER" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--text-1)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: projectRoot.replace(/\\/g, "/").split("/").at(-1) }),
      (sessionUsage.contextTokens > 0 || sessionUsage.contextFiles.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "var(--text-3)" }, children: "Context" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--amber)", fontFamily: "var(--font-mono)" }, children: [
            sessionUsage.contextFiles.length,
            " files · ",
            (sessionUsage.contextTokens / 1e3).toFixed(1),
            "k"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 4, background: "var(--bg-active)", borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: `${contextPercent || 3}%`, height: "100%", background: "var(--cyan)", borderRadius: 3 } }) }),
        sessionUsage.contextFiles.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { marginTop: 5, fontSize: 10, color: "var(--text-ghost)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
          sessionUsage.contextFiles.slice(0, 2).map((path) => path.split("/").at(-1)).join(", "),
          sessionUsage.contextFiles.length > 2 ? ` +${sessionUsage.contextFiles.length - 2}` : ""
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-3)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: filesTabStyle, onClick: () => setTab("files"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 16 }, children: "folder_open" }),
        " Files"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: historyTabStyle, onClick: () => setTab("history"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 16 }, children: "history" }),
        " Log ",
        history.length > 0 && `(${history.length})`
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { style: sessionsTabStyle, onClick: () => setTab("sessions"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 16 }, children: "dataset" }),
        " Sessions"
      ] })
    ] }),
    tab === "files" && (projectRoot ? /* @__PURE__ */ jsxRuntimeExports.jsx(ProjectFiles, { projectRoot, changedPaths, onOpenFile, refreshKey }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--text-ghost)", padding: "16px 14px" }, children: "Open a project to view files" })),
    tab === "history" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflow: "auto", padding: "8px 0" }, children: [
      history.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--text-ghost)", padding: "8px 14px" }, children: "No iterations yet" }),
      history.map((iter, i) => {
        const scoreColor = iter.harnessResult.score >= 90 ? "var(--teal)" : iter.harnessResult.score >= 70 ? "var(--yellow)" : "var(--red)";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { margin: "4px 6px", padding: "8px 10px", background: "var(--bg-1)", borderRadius: 6, border: "1px solid var(--border)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "var(--text-2)" }, children: [
              "#",
              iter.iteration + 1,
              " · ",
              iter.agentMode
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: scoreColor, fontWeight: 600 }, children: iter.harnessResult.score })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 10, color: "var(--text-3)", marginTop: 3 }, children: [
            iter.changes.length,
            " file",
            iter.changes.length !== 1 ? "s" : "",
            " · ",
            Math.round(iter.duration / 1e3),
            "s"
          ] }),
          iter.changes.slice(0, 3).map((c, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onOpenFile(c.path), style: { display: "block", width: "100%", textAlign: "left", background: "transparent", color: "var(--teal)", fontSize: 10, padding: "1px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: c.path.split("/").at(-1) }, ci)),
          iter.changes.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--text-3)" }, children: [
            "+ ",
            iter.changes.length - 3,
            " file",
            iter.changes.length - 3 !== 1 ? "s" : ""
          ] })
        ] }, i);
      })
    ] }),
    tab === "sessions" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflow: "auto", padding: "8px 0" }, children: [
      sessions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--text-ghost)", padding: "8px 14px" }, children: "No saved sessions" }),
      sessions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { margin: "4px 6px", padding: "8px 10px", background: "var(--bg-1)", borderRadius: 6, border: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "var(--text-1)", fontWeight: 500, wordBreak: "break-word", paddingRight: 6 }, children: s.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: async () => {
                await window.kova.deleteSession(projectRoot, s.id);
                setSessions(sessions.filter((sess) => sess.id !== s.id));
              },
              style: { background: "transparent", color: "var(--text-3)", padding: 2 },
              children: "✕"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--text-3)" }, children: [
            new Date(s.updatedAt).toLocaleDateString(),
            " · ",
            s.messages?.length || 0,
            " msgs"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => onLoadSession(s),
              style: { background: "var(--amber-dim)", color: "var(--amber)", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600 },
              children: "Load"
            }
          )
        ] })
      ] }, s.id))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MemoryPanel, { projectRoot, refreshKey }),
    totalTokens > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "8px 12px", borderTop: "1px solid var(--border)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--text-3)" }, children: [
      totalTokens >= 1e6 ? `${(totalTokens / 1e6).toFixed(1)}M` : `${(totalTokens / 1e3).toFixed(1)}k`,
      " tokens"
    ] }) })
  ] });
}
const TYPE_META$1 = {
  create: { label: "created", sign: "+", color: "var(--teal)", bg: "var(--teal-dim)" },
  modify: { label: "modified", sign: "~", color: "var(--yellow)", bg: "var(--yellow-dim)" },
  delete: { label: "deleted", sign: "-", color: "var(--red)", bg: "var(--red-dim)" }
};
const LINE_BG$1 = {
  add: "rgba(93,202,165,0.07)",
  remove: "rgba(226,75,74,0.07)",
  same: "transparent"
};
const LINE_MARKER_COLOR$1 = {
  add: "rgba(93,202,165,0.72)",
  remove: "rgba(226,75,74,0.72)",
  same: "transparent"
};
function buildDiffLines$1(change) {
  if (change.type === "delete") {
    return (change.before ?? "").split("\n").map((text) => ({ text, type: "remove" }));
  }
  if (change.type === "create" || !change.before) {
    return (change.diff ?? "").split("\n").map((text) => ({ text, type: "add" }));
  }
  const a = change.before.split("\n");
  const b = (change.diff ?? "").split("\n");
  if (a.length * b.length > 2e5) return b.map((text) => ({ text, type: "add" }));
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i2 = 1; i2 <= a.length; i2++) {
    for (let j2 = 1; j2 <= b.length; j2++) {
      dp[i2][j2] = a[i2 - 1] === b[j2 - 1] ? dp[i2 - 1][j2 - 1] + 1 : Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
    }
  }
  const result = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ text: a[i - 1], type: "same" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: b[j - 1], type: "add" });
      j--;
    } else {
      result.unshift({ text: a[i - 1], type: "remove" });
      i--;
    }
  }
  return result;
}
function FileCard({ change, defaultOpen = false }) {
  const [open, setOpen] = reactExports.useState(defaultOpen);
  const ext = getExt(change.path);
  const name = getFileName(change.path);
  const folder = getFolder(change.path);
  const meta = TYPE_META$1[change.type];
  const lines = buildDiffLines$1(change);
  const language = EXT_LANG[ext] ?? ext;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in", style: {
    border: "1px solid var(--border)",
    borderRadius: 8,
    marginBottom: 6,
    overflow: "hidden",
    background: "rgba(255,255,255,0.018)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setOpen((v) => !v), style: {
      width: "100%",
      textAlign: "left",
      padding: "9px 12px",
      background: open ? "rgba(255,255,255,0.035)" : "transparent",
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderRadius: 0,
      transition: "background 0.15s"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
        width: 22,
        height: 22,
        borderRadius: 6,
        flexShrink: 0,
        background: meta.bg,
        border: `1px solid ${meta.color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 800,
        color: meta.color,
        fontFamily: "var(--font-mono)"
      }, children: meta.sign }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1)",
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }, children: name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, padding: "1px 7px", borderRadius: 999, color: meta.color, background: meta.bg, flexShrink: 0 }, children: meta.label })
        ] }),
        folder && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "block", fontSize: 10, color: "var(--text-3)", marginTop: 1 }, children: [
          folder,
          "/"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }, children: language }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }, children: [
          lines.length,
          " lines"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
          fontSize: 12,
          color: "var(--text-3)",
          transition: "transform 0.2s ease",
          display: "inline-block",
          transform: open ? "rotate(90deg)" : "rotate(0deg)"
        }, children: ">" })
      ] })
    ] }),
    open && lines.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { maxHeight: 320, overflow: "auto", borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.18)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.65 }, children: lines.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: { display: "flex", background: LINE_BG$1[line.type] },
        onMouseEnter: (event) => {
          event.currentTarget.style.background = line.type === "same" ? "var(--bg-hover)" : LINE_BG$1[line.type];
        },
        onMouseLeave: (event) => {
          event.currentTarget.style.background = LINE_BG$1[line.type];
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { minWidth: 40, padding: "0 10px 0 8px", color: "var(--text-ghost)", userSelect: "none", textAlign: "right", flexShrink: 0, borderRight: "1px solid var(--border)" }, children: line.type !== "remove" ? i + 1 : "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: LINE_MARKER_COLOR$1[line.type], width: 14, flexShrink: 0, userSelect: "none", textAlign: "center" }, children: line.type === "add" ? "+" : line.type === "remove" ? "-" : "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "0 8px", color: "var(--text-2)", whiteSpace: "pre", flex: 1 }, children: line.text })
        ]
      },
      i
    )) }) })
  ] });
}
function serverActivityLabel(event) {
  if (event.type !== "server_starting" && event.type !== "server_ready" && event.type !== "server_failed") return null;
  const command = String(event.toolInput?.command ?? event.serverSession?.command ?? "server");
  if (event.type === "server_ready") {
    return event.serverSession?.url ? `Server ready at ${event.serverSession.url}` : `Server ready: ${command}`;
  }
  if (event.type === "server_failed") return `Server needs attention: ${command}`;
  return `Starting server: ${command}`;
}
const Spinner = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "animate-spin", style: { opacity: 0.8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) });
const IconCheck = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "20 6 9 17 4 12" }) });
const IconError = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
] });
const MAX_STREAMED_LINES = 40;
const VISIBLE_ACTIVITY_COUNT = 20;
function shortCommand(value) {
  const trimmed = value.trim();
  if (trimmed.length <= 96) return trimmed;
  return `${trimmed.slice(0, 93)}...`;
}
function ActivityFeed({ events }) {
  const activities = reactExports.useMemo(() => {
    const list = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.type === "tool_call") {
        const rawPath = String(e.toolInput?.path ?? e.toolInput?.command ?? e.message ?? "");
        const shortPath = rawPath.split(/[/\\]/).pop() || rawPath;
        let type = "read";
        let label = "";
        let lineCount;
        if (e.toolName === "write_file") {
          type = "write";
          const content = String(e.toolInput?.content ?? "");
          lineCount = content ? content.split("\n").length : void 0;
          label = `Writing ${shortPath}`;
        } else if (e.toolName === "edit_file") {
          type = "write";
          label = `Editing ${shortPath}`;
        } else if (e.toolName === "delete_file") {
          type = "write";
          label = `Deleting ${shortPath}`;
        } else if (e.toolName === "run_command") {
          type = "command";
          label = `$ ${shortCommand(rawPath)}`;
        } else if (e.toolName === "run_interactive_command") {
          type = "command";
          label = `↗ ${shortCommand(rawPath)} (terminal)`;
        } else if (e.toolName === "list_files") {
          type = "list";
          label = `Listing ${shortPath || "."}`;
        } else if (e.toolName === "grep_codebase") {
          const pattern = String(e.toolInput?.pattern ?? "");
          type = "read";
          label = `Searching: ${pattern.slice(0, 60)}`;
        } else if (e.toolName === "glob_files") {
          const pattern = String(e.toolInput?.pattern ?? "");
          type = "list";
          label = `Globbing ${pattern}`;
        } else if (e.toolName === "read_file") {
          type = "read";
          label = `Reading ${shortPath}`;
        } else if (e.toolName === "todo_write") {
          type = "list";
          label = "Updating todo list";
        } else {
          type = "read";
          label = `${e.toolName ?? "tool"} ${shortPath}`.trim();
        }
        list.push({ id: `tool_${i}`, type, status: "pending", label, detail: rawPath, fullPath: rawPath, lineCount });
      } else if (e.type === "tool_result") {
        const lastPending = [...list].reverse().find((a) => a.status === "pending" && a.type !== "validate");
        if (lastPending) {
          lastPending.status = e.message?.startsWith("Error:") || e.message?.startsWith("Blocked:") ? "error" : "success";
          if (lastPending.type === "command") lastPending.detail = e.message;
        }
      } else if (e.type === "provider_session_start" && e.providerMeta) {
        const m = e.providerMeta;
        const label = m.fallback ? `${m.resolvedProvider}/${m.resolvedModel ?? "?"} (fallback)` : `${m.resolvedProvider}/${m.resolvedModel ?? "auto"}`;
        list.push({ id: `pss_${i}`, type: "read", status: m.fallback ? "error" : "success", label, detail: m.fallbackReason });
      } else if (e.type === "server_starting" || e.type === "server_ready" || e.type === "server_failed") {
        const label = serverActivityLabel(e) ?? e.message ?? "Server session";
        list.push({
          id: `srv_${i}`,
          type: "server",
          status: e.type === "server_starting" ? "pending" : e.type === "server_ready" ? "success" : "error",
          label,
          detail: e.serverSession?.diagnostics?.join(", ") || e.message,
          fullPath: e.serverSession?.cwd
        });
      } else if (e.type === "validation_started") {
        list.push({ id: `val_${i}`, type: "validate", status: "pending", label: "Running harness validation" });
      } else if (e.type === "harness_layer_start") {
        const layer = e.harnessLayer ?? "harness";
        const cmd = e.message ? e.message.slice(0, 60) : layer;
        list.push({ id: `hl_${i}`, type: "command", status: "pending", label: `${layer}: ${cmd}`, detail: e.message });
      } else if (e.type === "harness_line") {
        const lastHarness = [...list].reverse().find((a) => a.type === "command" && a.status === "pending");
        if (lastHarness) lastHarness.detail = e.harnessLine?.slice(0, 120);
      } else if (e.type === "command_output") {
        const lastCmd = [...list].reverse().find(
          (a) => a.type === "command" && a.status === "pending" && a.id.startsWith("tool_") && (!a.commandId || a.commandId === e.commandId)
        );
        if (lastCmd && e.commandLine !== void 0) {
          lastCmd.commandId = e.commandId;
          if (!lastCmd.lines) lastCmd.lines = [];
          lastCmd.lines.push(e.commandLine);
          if (lastCmd.lines.length > MAX_STREAMED_LINES) lastCmd.lines = lastCmd.lines.slice(-MAX_STREAMED_LINES);
        }
      } else if (e.type === "context_ref_denied") {
        const path = String(e.toolInput?.path ?? e.message ?? "protected file");
        list.push({ id: `deny_${i}`, type: "read", status: "error", label: `Blocked ${path.split(/[/\\]/).pop()}`, detail: e.message });
      } else if (e.type === "file_mutation") {
        const change = e.changes?.[0];
        if (change) list.push({ id: `mut_${i}`, type: "write", status: "success", label: `${change.type} ${change.path.split("/").pop()}`, detail: change.path });
      } else if (e.type === "validation_completed") {
        const lastVal = [...list].reverse().find((a) => a.type === "validate" && a.status === "pending");
        if (lastVal) {
          lastVal.status = e.harnessResult?.passed ? "success" : "error";
          const failed = e.harnessResult?.layers.filter((layer) => !layer.skipped && !layer.passed).map((layer) => layer.command || layer.name);
          lastVal.detail = failed?.length ? `Failed: ${failed.join(", ")}` : `Score: ${e.harnessResult?.score ?? 0}/100`;
        }
      }
    }
    return list;
  }, [events]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityFeedView, { activities });
}
function ActivityFeedView({ activities }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  if (!activities.length) return null;
  const totalCount = activities.length;
  const overflow = Math.max(0, totalCount - VISIBLE_ACTIVITY_COUNT);
  const visible = expanded || overflow === 0 ? activities : activities.slice(-VISIBLE_ACTIVITY_COUNT);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginTop: 8, marginBottom: 12 }, children: [
    overflow > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => setExpanded((prev) => !prev),
        style: {
          alignSelf: "flex-start",
          fontSize: 11,
          color: "var(--text-3)",
          background: "transparent",
          border: "1px solid var(--border)",
          padding: "2px 10px",
          borderRadius: 12,
          cursor: "pointer",
          marginBottom: 4
        },
        children: expanded ? `Hide ${overflow} earlier step${overflow === 1 ? "" : "s"}` : `Show ${overflow} earlier step${overflow === 1 ? "" : "s"}`
      }
    ),
    visible.map((act) => /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityRow, { activity: act }, act.id))
  ] });
}
function ActivityRow({ activity: act }) {
  const isPending = act.status === "pending";
  const isError = act.status === "error";
  let color = "var(--text-2)";
  if (isError) color = "var(--red)";
  else if (act.type === "write") color = "var(--teal)";
  else if (act.type === "command") color = "var(--yellow)";
  else if (act.type === "validate") color = "var(--amber)";
  else if (act.type === "server") color = "var(--cyan)";
  else if (act.type === "list") color = "var(--text-2)";
  else color = "var(--purple)";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in", style: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "5px 10px",
    borderRadius: 6,
    background: isPending ? "var(--bg-active, rgba(255,255,255,0.04))" : "transparent",
    border: isPending ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
    transition: "all 0.2s ease",
    opacity: isPending ? 1 : isError ? 0.95 : 0.78
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      width: 16,
      marginTop: 2,
      display: "flex",
      justifyContent: "center",
      color: isPending ? color : isError ? "var(--red)" : "var(--teal)",
      flexShrink: 0
    }, children: isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, {}) : isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconError, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconCheck, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          title: act.fullPath ?? void 0,
          style: {
            color: isPending ? "var(--text-1)" : isError ? "var(--red)" : "var(--text-2)",
            fontSize: 12.5,
            fontWeight: isPending ? 600 : 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontFamily: act.type === "command" ? "var(--font-mono)" : "inherit"
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }, children: act.label }),
            act.lineCount !== void 0 && act.lineCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }, children: [
              "· ",
              act.lineCount,
              " line",
              act.lineCount === 1 ? "" : "s"
            ] }),
            !isPending && act.type === "validate" && act.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
              fontSize: 10,
              padding: "1px 6px",
              background: isError ? "var(--red-dim)" : "var(--teal-dim)",
              color: isError ? "var(--red)" : "var(--teal)",
              borderRadius: 4
            }, children: act.detail })
          ]
        }
      ),
      !isPending && act.detail && act.type === "command" && !act.lines && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { style: {
        margin: "4px 0 0",
        maxHeight: 90,
        overflow: "hidden",
        color: isError ? "var(--red)" : "var(--text-3)",
        fontSize: 10,
        whiteSpace: "pre-wrap",
        fontFamily: "var(--font-mono)"
      }, children: act.detail.slice(0, 700) }),
      act.lines && act.lines.length > 0 && act.type === "command" && /* @__PURE__ */ jsxRuntimeExports.jsxs("pre", { style: {
        margin: "4px 0 0",
        maxHeight: isPending ? 220 : 160,
        overflow: "auto",
        color: isError ? "var(--red)" : "var(--text-2)",
        fontSize: 10.5,
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        fontFamily: "var(--font-mono)",
        background: "rgba(0,0,0,0.32)",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)"
      }, children: [
        act.lines.join("\n"),
        isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
          display: "inline-block",
          width: 6,
          height: "1em",
          marginLeft: 2,
          background: "var(--yellow)",
          verticalAlign: "text-bottom",
          animation: "pulse-amber 0.9s infinite"
        } })
      ] })
    ] })
  ] });
}
function todoStatusLabel(status) {
  if (status === "in_progress") return "◐";
  if (status === "completed") return "●";
  return "○";
}
function todoCompletionPercent(todos) {
  if (todos.length === 0) return 0;
  const completed = todos.filter((t) => t.status === "completed").length;
  return Math.round(completed / todos.length * 100);
}
function todoActiveContent(todo) {
  return todo.status === "in_progress" ? todo.activeForm : todo.content;
}
function todoIsAllCompleted(todos) {
  if (todos.length === 0) return false;
  return todos.every((t) => t.status === "completed");
}
function todoSummaryLine(todos) {
  if (todos.length === 0) return "No plan";
  const completed = todos.filter((t) => t.status === "completed").length;
  return `${completed} of ${todos.length} complete`;
}
function TodoListCard({ todos }) {
  if (todos.length === 0) return null;
  const percent = todoCompletionPercent(todos);
  const allDone = todoIsAllCompleted(todos);
  const summary = todoSummaryLine(todos);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 12,
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--text-1)"
      },
      "data-testid": "todo-list-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600, color: "var(--text-1)" }, children: "Plan" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: allDone ? "var(--cyan)" : "var(--text-2)", fontSize: 12 }, children: summary })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              height: 3,
              width: "100%",
              background: "var(--bg-3)",
              borderRadius: 2,
              overflow: "hidden",
              marginBottom: 10
            },
            "aria-label": `progress: ${percent}%`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  width: `${percent}%`,
                  height: "100%",
                  background: allDone ? "var(--cyan)" : "var(--teal)",
                  transition: "width 200ms ease-out"
                }
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { listStyle: "none", padding: 0, margin: 0 }, children: todos.map((todo, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(TodoRow, { todo }, `${i}-${todo.content}`)) })
      ]
    }
  );
}
function TodoRow({ todo }) {
  const glyph = todoStatusLabel(todo.status);
  const text = todoActiveContent(todo);
  const muted = todo.status === "completed";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "li",
    {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "4px 0",
        lineHeight: 1.5
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "aria-hidden": true,
            style: {
              color: todo.status === "completed" ? "var(--cyan)" : todo.status === "in_progress" ? "var(--amber)" : "var(--text-3)",
              fontSize: 14,
              minWidth: 14,
              textAlign: "center"
            },
            children: glyph
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            style: {
              color: muted ? "var(--text-3)" : "var(--text-1)",
              textDecoration: muted ? "line-through" : "none",
              fontStyle: todo.status === "in_progress" ? "italic" : "normal"
            },
            children: text
          }
        )
      ]
    }
  );
}
const HIDDEN = { show: false, tone: "info", text: "" };
function getValidationConfidenceCopy(confidence) {
  if (confidence === void 0 || confidence === "full") return HIDDEN;
  if (confidence === "none") {
    return {
      show: true,
      tone: "warning",
      text: "Score capped at 75 - no build/test commands detected for this project. Add them in your stack config to unlock full auto-apply."
    };
  }
  return {
    show: true,
    tone: "info",
    text: "Score capped - only partial validation ran (some layers were skipped). Configure missing build/test/lint commands to unlock full auto-apply."
  };
}
const MAX_FILES_IN_LABEL = 2;
function basename(p) {
  return p.split(/[/\\]/).pop() || p;
}
function summarizeRecent(events) {
  const writePaths = [];
  const seen2 = /* @__PURE__ */ new Set();
  const uniqueWritePaths = [];
  let lastCommand = null;
  let runningCommandLines = 0;
  let lastHarnessLayer = null;
  let searchPattern = null;
  let lastAgentMode = null;
  for (const e of events) {
    if (e.type === "tool_call") {
      const path = typeof e.toolInput?.path === "string" ? e.toolInput.path : "";
      if ((e.toolName === "write_file" || e.toolName === "edit_file" || e.toolName === "delete_file") && path) {
        writePaths.push(path);
        if (!seen2.has(path)) {
          seen2.add(path);
          uniqueWritePaths.push(path);
        }
      } else if (e.toolName === "run_command" || e.toolName === "run_interactive_command") {
        const cmd = typeof e.toolInput?.command === "string" ? e.toolInput.command : "";
        lastCommand = cmd;
        runningCommandLines = 0;
      } else if (e.toolName === "grep_codebase") {
        const pat = typeof e.toolInput?.pattern === "string" ? e.toolInput.pattern : "";
        searchPattern = pat;
      }
    } else if (e.type === "tool_result") {
      lastCommand = null;
      runningCommandLines = 0;
    } else if (e.type === "command_output") {
      runningCommandLines += 1;
    } else if (e.type === "harness_layer_start" && e.harnessLayer) {
      lastHarnessLayer = e.harnessLayer;
    } else if (e.type === "validation_completed") {
      lastHarnessLayer = null;
    } else if (e.type === "agent_started") {
      lastAgentMode = e.mode ?? null;
    }
  }
  return { writePaths, uniqueWritePaths, lastCommand, runningCommandLines, lastHarnessLayer, searchPattern, lastAgentMode };
}
function shortenCommand(cmd) {
  const trimmed = cmd.trim();
  if (trimmed.length <= 50) return trimmed;
  return `${trimmed.slice(0, 47)}...`;
}
function formatPathList(paths, total) {
  if (paths.length === 0) return "";
  const shown = paths.slice(-MAX_FILES_IN_LABEL).map(basename).join(", ");
  if (total > MAX_FILES_IN_LABEL) return `${shown} (${total} files)`;
  return shown;
}
function contextualStatusLabel(status, events) {
  if (!status) return "Processing...";
  const recent = summarizeRecent(events);
  if (status === "structuring") return "Structuring task...";
  if (status === "planning") {
    if (recent.searchPattern) return `Searching: ${recent.searchPattern.slice(0, 40)}`;
    return "Planning...";
  }
  if (status === "coding") {
    if (recent.lastCommand) {
      const detail = recent.runningCommandLines > 0 ? ` · ${recent.runningCommandLines} line${recent.runningCommandLines === 1 ? "" : "s"}` : "";
      return `${recent.lastAgentMode === "fix" ? "Repairing with" : "Running"} ${shortenCommand(recent.lastCommand)}${detail}`;
    }
    if (recent.uniqueWritePaths.length > 0) {
      const list = formatPathList(recent.uniqueWritePaths, recent.uniqueWritePaths.length);
      return `${recent.lastAgentMode === "fix" ? "Repairing" : "Editing"} ${list}`;
    }
    if (recent.searchPattern) return `Searching: ${recent.searchPattern.slice(0, 40)}`;
    if (recent.lastAgentMode === "fix") return "Repairing failures...";
    return "Generating code...";
  }
  if (status === "repairing") {
    if (recent.lastCommand) return `Repairing with ${shortenCommand(recent.lastCommand)}`;
    if (recent.uniqueWritePaths.length > 0) return `Repairing ${formatPathList(recent.uniqueWritePaths, recent.uniqueWritePaths.length)}`;
    return "Repairing failures...";
  }
  if (status === "server_starting") return "Starting dev server...";
  if (status === "server_ready") return "Dev server is ready.";
  if (status === "awaiting_approval") return "Waiting for command approval...";
  if (status === "blocked") return "Blocked; needs attention.";
  if (status === "validating") {
    if (recent.lastHarnessLayer) return `Validating: ${recent.lastHarnessLayer}`;
    return "Running harness validation...";
  }
  if (status === "deciding") return "Reviewing changes...";
  if (status === "applying") {
    const count = recent.uniqueWritePaths.length;
    return count > 0 ? `Applying ${count} file${count === 1 ? "" : "s"}...` : "Applying changes...";
  }
  return "Processing...";
}
function shouldRenderFloatingResultCard(state) {
  return state.hasResult && !state.showLive && !state.hasStructuredTaskResult && state.lastMessageRole !== "user";
}
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024;
function classifyAttachment(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("text/") || mimeType === "application/json") return "text";
  return "document";
}
async function fileToAttachment(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  const base64 = btoa(binary);
  return {
    kind: classifyAttachment(file.type || "application/octet-stream"),
    name: file.name || "unnamed",
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    base64
  };
}
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function AttachmentChip({ attachment, onRemove }) {
  const isImage = attachment.kind === "image";
  const dataUrl = isImage ? `data:${attachment.mimeType};base64,${attachment.base64}` : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px 6px 6px",
    background: "var(--bg-3)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 11,
    color: "var(--text-2)",
    maxWidth: 240
  }, children: [
    dataUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: dataUrl, alt: attachment.name, style: { width: 32, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 18, color: "var(--text-3)" }, children: attachment.kind === "text" ? "description" : "attach_file" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }, children: attachment.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-3)", fontSize: 10 }, children: formatBytes(attachment.sizeBytes) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: onRemove,
        title: "Remove attachment",
        style: {
          width: 18,
          height: 18,
          borderRadius: 4,
          background: "transparent",
          border: "none",
          color: "var(--text-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: "pointer"
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 14 }, children: "close" })
      }
    )
  ] });
}
const SLASH_COMMANDS = [
  { cmd: "/plan", label: "Plan", detail: "Analyze and create a technical plan — no file changes" },
  { cmd: "/review", label: "Review", detail: "Read-only code review with detailed findings" },
  { cmd: "/chat", label: "Chat", detail: "Read-only Q&A — answer questions without touching files" }
];
function SlashPalette({ query, onSelect }) {
  const matches = SLASH_COMMANDS.filter((c) => c.cmd.startsWith(query.toLowerCase()));
  if (!matches.length) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    marginBottom: 8,
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 280,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    zIndex: 50
  }, children: matches.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: () => onSelect(m.cmd),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "transparent",
        textAlign: "left",
        borderBottom: "1px solid var(--border)"
      },
      className: "kova-slash-option",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cyan)", fontWeight: 700, minWidth: 60 }, children: m.cmd }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-1)", fontSize: 13, fontWeight: 600 }, children: m.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-3)", fontSize: 11, marginTop: 1 }, children: m.detail })
        ] })
      ]
    },
    m.cmd
  )) });
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
  });
}
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "var(--text-1)", fontWeight: 700 }, children: p.slice(2, -2) }, i);
    if (p.startsWith("*") && p.endsWith("*"))
      return /* @__PURE__ */ jsxRuntimeExports.jsx("em", { style: { color: "var(--text-2)" }, children: p.slice(1, -1) }, i);
    if (p.startsWith("`") && p.endsWith("`"))
      return /* @__PURE__ */ jsxRuntimeExports.jsx("code", { style: { fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg-3)", padding: "1px 5px", borderRadius: 4, color: "var(--cyan)" }, children: p.slice(1, -1) }, i);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(React.Fragment, { children: p }, i);
  });
}
function renderTextBlock(text, key) {
  const lines = text.split("\n");
  const nodes = [];
  let listItems = [];
  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "6px 0 6px 18px", padding: 0 }, children: listItems }, `list-${nodes.length}`));
    listItems = [];
  };
  lines.forEach((line, li) => {
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    if (h3) {
      flushList();
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginTop: 14, marginBottom: 4 }, children: renderInline(h3[1]) }, li));
      return;
    }
    if (h2) {
      flushList();
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--cyan)", marginTop: 16, marginBottom: 5, borderBottom: "1px solid var(--border)", paddingBottom: 4 }, children: renderInline(h2[1]) }, li));
      return;
    }
    if (h1) {
      flushList();
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--teal)", marginTop: 18, marginBottom: 6 }, children: renderInline(h1[1]) }, li));
      return;
    }
    if (/^---+$/.test(line.trim())) {
      flushList();
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("hr", { style: { border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" } }, li));
      return;
    }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      listItems.push(/* @__PURE__ */ jsxRuntimeExports.jsx("li", { style: { color: "var(--text-2)", fontSize: 13, lineHeight: 1.65, marginBottom: 2 }, children: renderInline(bullet[1]) }, li));
      return;
    }
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushList();
      const isHeader = line.includes("---");
      if (!isHeader) {
        const cells = line.split("|").filter((_, ci) => ci > 0 && ci < line.split("|").length - 1);
        nodes.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 1, margin: "1px 0" }, children: cells.map((cell, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, padding: "3px 8px", background: "var(--bg-3)", fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: renderInline(cell.trim()) }, ci)) }, li)
        );
      }
      return;
    }
    flushList();
    if (line === "") {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("br", {}, li));
      return;
    }
    nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { lineHeight: 1.7 }, children: renderInline(line) }, li));
  });
  flushList();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(React.Fragment, { children: nodes }, key);
}
function renderMarkdown(text) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const lang = match?.[1] ?? "";
      const code = match?.[2] ?? part.slice(3, -3);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
        background: "var(--bg-0)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        margin: "10px 0"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 12px",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--border)"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }, children: lang || "code" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => copyToClipboard(code),
              title: "Copiar",
              style: { background: "transparent", color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4, fontSize: 10 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 13 }, children: "content_copy" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { style: { margin: 0, padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-1)", overflowX: "auto", lineHeight: 1.6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: code }) })
      ] }, i);
    }
    return renderTextBlock(part, i);
  });
}
function UserBubble({ msg }) {
  const atRefs = (msg.content.match(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g) ?? []).map((m) => m.replace(/^@/, "").replace(/[)\].!?]+$/, "").trim()).filter(Boolean);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { maxWidth: "78%", display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }, children: [
    atRefs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }, children: atRefs.map((ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
      fontSize: 10,
      padding: "1px 7px",
      borderRadius: 6,
      background: "var(--bg-3)",
      color: "var(--text-3)",
      fontFamily: "var(--font-mono)",
      border: "1px solid var(--border)"
    }, children: [
      "@",
      ref.split(/[/\\]/).pop()
    ] }, ref)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      padding: "10px 14px",
      background: "var(--bg-3)",
      border: "1px solid var(--border)",
      borderRadius: "12px 2px 12px 12px",
      color: "var(--text-1)",
      fontSize: 13.5,
      lineHeight: 1.65,
      wordBreak: "break-word"
    }, children: msg.content.trim() })
  ] }) });
}
function AgentResultCard({ msg }) {
  const [expandV, setExpandV] = reactExports.useState(false);
  const ok = msg.decision === "apply";
  const statusColor = ok ? "var(--teal)" : msg.decision === "needs_review" ? "var(--yellow)" : "var(--red)";
  const statusIcon = ok ? "✓" : msg.decision === "needs_review" ? "⏸" : "✗";
  const created = msg.filesChanged.filter((f) => f.status === "created").length;
  const modified = msg.filesChanged.filter((f) => f.status === "modified").length;
  const deleted = msg.filesChanged.filter((f) => f.status === "deleted").length;
  const parts = [];
  if (created) parts.push(`+${created}`);
  if (modified) parts.push(`~${modified}`);
  if (deleted) parts.push(`−${deleted}`);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-fade-in", style: { marginBottom: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { border: "1px solid var(--border)", borderRadius: "2px 12px 12px 12px", overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", background: "var(--bg-1)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: statusColor, fontSize: 14, fontWeight: 700, flexShrink: 0 }, children: statusIcon }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-1)", fontSize: 13, fontWeight: 600 }, children: msg.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-3)", fontSize: 11, marginTop: 1 }, children: msg.summary })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }, children: [
        parts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)", background: "var(--bg-3)", padding: "1px 7px", borderRadius: 8 }, children: parts.join(" ") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: msg.risk === "low" ? "var(--teal)" : msg.risk === "medium" ? "var(--yellow)" : "var(--red)", background: "var(--bg-3)", padding: "1px 7px", borderRadius: 8, fontFamily: "var(--font-mono)" }, children: msg.risk })
      ] })
    ] }),
    msg.validations.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "5px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-3)", display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "var(--text-3)" }, children: "checks:" }),
      (expandV ? msg.validations : msg.validations.slice(0, 5)).map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 8,
        fontFamily: "var(--font-mono)",
        color: v.status === "passed" ? "var(--teal)" : v.status === "failed" ? "var(--red)" : "var(--text-3)",
        background: v.status === "passed" ? "var(--teal-dim)" : v.status === "failed" ? "var(--red-dim)" : "var(--bg-active)"
      }, children: [
        v.command,
        " ",
        v.status === "passed" ? "✓" : v.status === "failed" ? "✗" : "—"
      ] }, i)),
      msg.validations.length > 5 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setExpandV((e) => !e), style: { fontSize: 10, color: "var(--text-3)", background: "transparent" }, children: expandV ? "less" : `+${msg.validations.length - 5}` })
    ] }),
    msg.filesChanged.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 10px", background: "var(--bg-2)" }, children: msg.filesChanged.map((f, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, padding: "3px 5px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
        fontSize: 9,
        padding: "1px 5px",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        flexShrink: 0,
        color: f.status === "created" ? "var(--teal)" : f.status === "deleted" ? "var(--red)" : "var(--yellow)",
        background: f.status === "created" ? "var(--teal-dim)" : f.status === "deleted" ? "var(--red-dim)" : "var(--yellow-dim)"
      }, children: f.status === "created" ? "+" : f.status === "deleted" ? "−" : "~" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--text-2)", fontSize: 12, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: f.path })
    ] }, i)) }),
    msg.notes.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "5px 12px", background: "var(--bg-1)", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-3)", fontStyle: "italic" }, children: msg.notes.join(" · ") })
  ] }) });
}
function fileExtensionBadge(path) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map = {
    ts: { label: "TS", color: "#3178C6" },
    tsx: { label: "TSX", color: "#3178C6" },
    js: { label: "JS", color: "#F7DF1E" },
    jsx: { label: "JSX", color: "#F7DF1E" },
    py: { label: "PY", color: "#3776AB" },
    go: { label: "GO", color: "#00ADD8" },
    rs: { label: "RS", color: "#DEA584" },
    java: { label: "JV", color: "#B07219" },
    rb: { label: "RB", color: "#CC342D" },
    php: { label: "PHP", color: "#777BB4" },
    cs: { label: "C#", color: "#178600" },
    cpp: { label: "C++", color: "#F34B7D" },
    c: { label: "C", color: "#555555" },
    swift: { label: "SW", color: "#FFAC45" },
    kt: { label: "KT", color: "#A97BFF" },
    dart: { label: "DART", color: "#00B4AB" },
    html: { label: "HTML", color: "#E34C26" },
    css: { label: "CSS", color: "#563D7C" },
    scss: { label: "SCSS", color: "#C6538C" },
    json: { label: "JSON", color: "#999999" },
    md: { label: "MD", color: "#888888" },
    yml: { label: "YML", color: "#CB171E" },
    yaml: { label: "YML", color: "#CB171E" },
    sql: { label: "SQL", color: "#E38C00" }
  };
  return map[ext] ?? { label: ext.slice(0, 4).toUpperCase() || "FILE", color: "var(--text-3)" };
}
function parseApproachSteps(approach) {
  const trimmed = approach.trim().replace(/\r\n/g, "\n");
  const numbered = trimmed.replace(/\s+(\d+[.)]\s+)/g, "\n$1").split(/\n+/).map((line) => line.trim()).filter((line) => /^\d+[.)]\s+/.test(line));
  if (numbered.length >= 2) {
    return numbered.map((s) => s.replace(/^\d+[.)]\s+/, "").trim()).filter(Boolean);
  }
  const bullets = trimmed.split(/\n+/).filter((line) => /^\s*[-*]\s+/.test(line));
  if (bullets.length >= 2) {
    return bullets.map((s) => s.replace(/^\s*[-*]\s+/, "").trim()).filter(Boolean);
  }
  return trimmed ? [trimmed] : [];
}
function PlanResultCard({ msg }) {
  const riskColor = msg.risk === "low" ? "var(--teal)" : msg.risk === "medium" ? "var(--yellow)" : "var(--red)";
  const riskBg = msg.risk === "low" ? "var(--teal-dim)" : msg.risk === "medium" ? "var(--yellow-dim)" : "var(--red-dim)";
  const steps = parseApproachSteps(msg.approach);
  const hasContent = msg.files.length > 0 || steps.length > 0 || msg.validations.length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-fade-in", style: { marginBottom: 18 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    border: "1px solid var(--border)",
    borderRadius: 8,
    overflow: "hidden",
    background: "var(--bg-1)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.25)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      padding: "14px 18px",
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      borderBottom: "1px solid var(--border)",
      background: "linear-gradient(180deg, rgba(164,230,255,0.04) 0%, transparent 100%)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        background: "var(--cyan-dim)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--cyan)",
        fontSize: 14,
        fontWeight: 700,
        flexShrink: 0
      }, children: "P" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
          color: "var(--text-3)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 4
        }, children: "Implementation Plan" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
          color: "var(--text-1)",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.45,
          wordBreak: "break-word"
        }, children: msg.objective })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
        fontSize: 10,
        color: riskColor,
        background: riskBg,
        padding: "4px 10px",
        borderRadius: 8,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        flexShrink: 0,
        alignSelf: "flex-start",
        marginTop: 2
      }, children: [
        msg.risk,
        " risk"
      ] })
    ] }),
    msg.files.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 18px", borderBottom: hasContent ? "1px solid var(--border)" : void 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
        color: "var(--text-3)",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 8
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Files" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
          fontSize: 9,
          padding: "1px 6px",
          borderRadius: 8,
          background: "var(--bg-active)",
          color: "var(--text-3)",
          fontFamily: "var(--font-mono)",
          textTransform: "none"
        }, children: msg.files.length })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: msg.files.map((f, i) => {
        const badge = fileExtensionBadge(f.path);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
            fontSize: 9,
            fontWeight: 700,
            padding: "3px 6px",
            borderRadius: 4,
            background: "var(--bg-3)",
            color: badge.color,
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
            minWidth: 32,
            textAlign: "center",
            letterSpacing: "0.02em"
          }, children: badge.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
              color: "var(--text-1)",
              fontSize: 12.5,
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              wordBreak: "break-all"
            }, children: f.path }),
            f.reason && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
              color: "var(--text-3)",
              fontSize: 11.5,
              marginTop: 2,
              lineHeight: 1.45
            }, children: f.reason })
          ] })
        ] }, i);
      }) })
    ] }),
    steps.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 18px", borderBottom: msg.validations.length > 0 ? "1px solid var(--border)" : void 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
        color: "var(--text-3)",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 10
      }, children: "Approach" }),
      steps.length > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { style: { margin: 0, padding: 0, listStyle: "none" }, children: steps.map((step, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { style: {
        display: "flex",
        gap: 12,
        padding: "6px 0",
        borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : void 0
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
          fontSize: 10,
          fontWeight: 700,
          color: "var(--cyan)",
          background: "var(--cyan-dim)",
          minWidth: 22,
          height: 22,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: "var(--font-mono)"
        }, children: i + 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
          color: "var(--text-2)",
          fontSize: 12.5,
          lineHeight: 1.6,
          paddingTop: 2
        }, children: step })
      ] }, i)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
        color: "var(--text-2)",
        fontSize: 12.5,
        lineHeight: 1.65,
        whiteSpace: "pre-wrap"
      }, children: steps[0] })
    ] }),
    msg.validations.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 18px", background: "var(--bg-2)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
        color: "var(--text-3)",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8
      }, children: "Validation" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: msg.validations.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--text-ghost)", fontSize: 12, fontFamily: "var(--font-mono)" }, children: "$" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { style: {
          fontSize: 11.5,
          color: "var(--text-1)",
          fontFamily: "var(--font-mono)",
          wordBreak: "break-all"
        }, children: v })
      ] }, i)) })
    ] }),
    !hasContent && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "14px 18px", color: "var(--text-3)", fontSize: 12, fontStyle: "italic" }, children: "The model did not produce a structured plan. Try rephrasing the request or switch to a stronger model." })
  ] }) });
}
function AssistantBubble({ msg }) {
  if (msg.structured?.kind === "agent_result") return /* @__PURE__ */ jsxRuntimeExports.jsx(AgentResultCard, { msg: msg.structured });
  if (msg.structured?.kind === "plan_result") return /* @__PURE__ */ jsxRuntimeExports.jsx(PlanResultCard, { msg: msg.structured });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 10, marginBottom: 20 }, className: "animate-fade-in", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, minWidth: 0, color: "var(--text-1)", fontSize: 13.5, lineHeight: 1.7, wordBreak: "break-word" }, children: renderMarkdown(msg.content) }) });
}
function ReasoningPanel({ reasoning }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  const now = useTicker$1(reasoning.active);
  const elapsed = reasoning.startedAt ? formatDuration$1((reasoning.active ? now : reasoning.endedAt ?? now) - reasoning.startedAt) : "0s";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-reasoning-panel", "data-active": reasoning.active, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", className: "kova-reasoning-header", onClick: () => setExpanded((v) => !v), "aria-expanded": expanded, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-reasoning-orb", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-reasoning-title", children: reasoning.active ? "Thinking..." : "Thinking done" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-reasoning-time", children: elapsed }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "kova-reasoning-dots", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", {})
      ] })
    ] }),
    expanded && reasoning.text.trim() && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "kova-reasoning-body", children: reasoning.text })
  ] });
}
function useTicker$1(active) {
  const [now, setNow] = reactExports.useState(Date.now());
  reactExports.useEffect(() => {
    if (!active) {
      setNow(Date.now());
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1e3);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}
function formatDuration$1(ms) {
  const s = Math.max(0, Math.floor(ms / 1e3));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}
function TaskResultCard({ executionState }) {
  const last = executionState.iterationHistory.at(-1);
  if (!last || last.changes.length === 0) return null;
  const { changes, harnessResult, decision } = last;
  const score = decision.score ?? harnessResult.score;
  const status = executionState.status;
  const iters = executionState.iterationHistory.length;
  const created = changes.filter((c) => c.type === "create").length;
  const modified = changes.filter((c) => c.type === "modify").length;
  const deleted = changes.filter((c) => c.type === "delete").length;
  const parts = [
    created > 0 && `+${created} created`,
    modified > 0 && `~${modified} modified`,
    deleted > 0 && `-${deleted} deleted`
  ].filter(Boolean);
  const statusColor = status === "completed" ? "var(--teal)" : status === "paused" ? "var(--yellow)" : "var(--red)";
  const statusLabel = status === "completed" ? "Applied" : status === "paused" ? "Awaiting review" : decision.reason || "Repair needed";
  const passedLayers = harnessResult.layers.filter((l) => l.passed && !l.skipped);
  const failedLayers = harnessResult.layers.filter((l) => !l.passed && !l.skipped);
  const scoreColor = score >= 90 ? "var(--teal)" : score >= 70 ? "var(--yellow)" : "var(--red)";
  const validationCopy = getValidationConfidenceCopy(harnessResult.validationConfidence);
  const statusTitle = status === "completed" ? "Changes ready" : status === "paused" ? "Review required" : "Repair needed";
  const statusMark = status === "completed" ? "OK" : status === "paused" ? "!" : "x";
  const summaryText = parts.length > 0 ? parts.join(" / ") : "No file changes";
  const repairHint = status === "failed" && failedLayers.length > 0 ? `Kova is using ${failedLayers.map((layer) => layer.name).join(", ")} output as repair context.` : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-fade-in", style: { marginBottom: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--bg-1)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
        width: 26,
        height: 26,
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        background: status === "completed" ? "var(--teal-dim)" : status === "paused" ? "var(--yellow-dim)" : "var(--red-dim)",
        color: statusColor,
        fontSize: 11,
        fontWeight: 800,
        fontFamily: "var(--font-mono)",
        flexShrink: 0
      }, children: statusMark }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--text-1)", fontSize: 13.5, fontWeight: 700 }, children: statusTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)" }, children: summaryText })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--text-3)", fontSize: 11.5, lineHeight: 1.45, marginTop: 2 }, children: statusLabel })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", display: "flex", gap: 5, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }, children: [
        iters > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--yellow)", background: "var(--yellow-dim)", padding: "1px 6px", borderRadius: 8, fontFamily: "var(--font-mono)" }, children: [
          "iter ",
          iters
        ] }),
        passedLayers.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--teal)", background: "var(--teal-dim)", padding: "1px 6px", borderRadius: 8, fontFamily: "var(--font-mono)" }, children: [
          l.name,
          " ok"
        ] }, l.name)),
        failedLayers.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--red)", background: "var(--red-dim)", padding: "1px 6px", borderRadius: 8, fontFamily: "var(--font-mono)" }, children: [
          l.name,
          " failed"
        ] }, l.name)),
        harnessResult.layers.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: scoreColor, fontFamily: "var(--font-mono)", fontWeight: 700 }, children: score })
      ] })
    ] }),
    iters > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "5px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 5, background: "var(--bg-3)", fontFamily: "var(--font-mono)", fontSize: 10 }, children: executionState.iterationHistory.map((rec, i) => {
      const s = rec.harnessResult.score;
      const c = s >= 90 ? "var(--teal)" : s >= 70 ? "var(--yellow)" : "var(--red)";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: i === iters - 1 ? c : "var(--text-3)" }, children: [
        i + 1,
        ":",
        s,
        i < iters - 1 ? " ->" : ""
      ] }, i);
    }) }),
    status !== "completed" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "8px 14px", borderBottom: "1px solid var(--border)", fontSize: 11.5, color: statusColor, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: status === "failed" ? "rgba(226,75,74,0.045)" : "transparent" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { width: 6, height: 6, borderRadius: 999, background: statusColor, flexShrink: 0 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: status === "failed" ? "Repair context" : statusLabel }),
      repairHint && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--text-3)" }, children: repairHint })
    ] }),
    validationCopy.show && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      padding: "8px 14px",
      borderBottom: "1px solid var(--border)",
      background: validationCopy.tone === "warning" ? "var(--yellow-dim)" : "var(--cyan-dim)",
      color: validationCopy.tone === "warning" ? "var(--yellow)" : "var(--cyan)",
      fontSize: 11,
      lineHeight: 1.5,
      display: "flex",
      gap: 8,
      alignItems: "flex-start"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, lineHeight: 1.2, flexShrink: 0, marginTop: 1, fontWeight: 800 }, children: "i" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: validationCopy.text })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "8px 10px", background: "var(--bg-2)" }, children: changes.map((change, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(FileCard, { change, defaultOpen: changes.length === 1 }, i)) })
  ] }) });
}
function extractAtRefs(text) {
  const refs = [];
  for (const m of text.matchAll(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g)) {
    const ref = (m[1] ?? m[2] ?? m[3] ?? "").replace(/[)\].!?]+$/, "").trim();
    if (ref && !refs.includes(ref)) refs.push(ref);
  }
  return refs;
}
function ChatArea({
  messages,
  executionState,
  isThinking,
  isRunning,
  streamingText,
  reasoning,
  events,
  projectRoot,
  onSend,
  onOpenFolder,
  queuedMessages,
  activeMode,
  sessionUsage,
  activeModel,
  todos,
  onModeChange,
  onClearQueue,
  supportsVision
}) {
  const [value, setValue] = reactExports.useState("");
  const [showSlash, setShowSlash] = reactExports.useState(false);
  const [attachments, setAttachments] = reactExports.useState([]);
  const [attachmentError, setAttachmentError] = reactExports.useState(null);
  const [isDragging, setIsDragging] = reactExports.useState(false);
  const bottomRef = reactExports.useRef(null);
  const textareaRef = reactExports.useRef(null);
  const fileInputRef = reactExports.useRef(null);
  const addFiles = reactExports.useCallback(async (files) => {
    if (files.length === 0) return;
    const currentTotal = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
    let runningTotal = currentTotal;
    const added = [];
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(`${file.name}: max 10 MB per file`);
        continue;
      }
      if (runningTotal + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        setAttachmentError(`Total exceeds 50 MB — drop some attachments`);
        break;
      }
      const isImage = (file.type || "").startsWith("image/");
      if (isImage && supportsVision === false) {
        setAttachmentError(`${activeModel ?? "Active model"} does not support images. Switch to a vision model.`);
        continue;
      }
      runningTotal += file.size;
      added.push(await fileToAttachment(file));
    }
    if (added.length > 0) {
      setAttachments((prev) => [...prev, ...added]);
      setAttachmentError(null);
    }
  }, [attachments, supportsVision, activeModel]);
  const removeAttachment = reactExports.useCallback((index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
  }, []);
  const onPickFiles = reactExports.useCallback((e) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  }, [addFiles]);
  const onDrop = reactExports.useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer?.files?.length) return;
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);
  const onDragOver = reactExports.useCallback((e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);
  const onDragLeave = reactExports.useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);
  const onPaste = reactExports.useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  }, [addFiles]);
  reactExports.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, executionState?.status, isThinking, streamingText, reasoning.active]);
  reactExports.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.3))}px`;
  }, [value]);
  reactExports.useEffect(() => {
    const trimmed = value.trimStart();
    setShowSlash(trimmed.startsWith("/") && !trimmed.includes(" "));
  }, [value]);
  const submit = reactExports.useCallback(() => {
    const t = value.trim();
    if (!t && attachments.length === 0 || !projectRoot) return;
    if (/^\/plan(\s|$)/i.test(t)) onModeChange("plan");
    else if (/^\/review(\s|$)/i.test(t)) onModeChange("review");
    else if (/^\/chat(\s|$)/i.test(t)) onModeChange("chat");
    onSend(t, void 0, attachments.length > 0 ? attachments : void 0);
    setValue("");
    setAttachments([]);
    setAttachmentError(null);
  }, [value, attachments, projectRoot, onSend, onModeChange]);
  const onKeyDown = reactExports.useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") setShowSlash(false);
  }, [submit]);
  const selectSlashCommand = (cmd) => {
    const modeKey = cmd.slice(1);
    onModeChange(modeKey);
    setValue("");
    setShowSlash(false);
    textareaRef.current?.focus();
  };
  const atRefs = extractAtRefs(value);
  const isEmpty = messages.length === 0 && !executionState && !isThinking && !streamingText && events.length === 0;
  const lastIter = executionState?.iterationHistory?.at(-1);
  const hasResult = !!lastIter && lastIter.changes.length > 0;
  const isActive2 = !!executionState && !["completed", "failed", "paused"].includes(executionState.status);
  const showLive = (isRunning || isThinking || reasoning.active) && !hasResult;
  const hasStructuredTaskResult = messages.some((msg) => msg.structured?.kind === "agent_result");
  const showTodoCard = todos.length > 0 && (isActive2 || isRunning || isThinking || reasoning.active);
  const showResultCard = shouldRenderFloatingResultCard({
    hasResult,
    showLive,
    hasStructuredTaskResult,
    lastMessageRole: messages.at(-1)?.role
  });
  const totalTokens = sessionUsage.contextTokens + sessionUsage.completionTokens;
  const contextPct = sessionUsage.maxContextTokens ? Math.min(100, Math.round(sessionUsage.contextTokens / sessionUsage.maxContextTokens * 100)) : 0;
  const isNonDefaultMode = activeMode === "plan" || activeMode === "review";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflow: "auto", padding: "24px 28px 12px", scrollbarWidth: "thin" }, children: [
      isEmpty && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
          width: 82,
          height: 82,
          borderRadius: 18,
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, rgba(116, 211, 255, 0.10), rgba(9, 11, 13, 0.12))",
          border: "1px solid rgba(116, 211, 255, 0.16)",
          boxShadow: "0 18px 54px rgba(0, 0, 0, 0.34)"
        }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: kovaLogo,
            alt: "",
            "aria-hidden": "true",
            style: {
              width: 62,
              height: 62,
              objectFit: "contain",
              filter: "invert(1) brightness(0.88) drop-shadow(0 0 18px rgba(116, 211, 255, 0.22))",
              opacity: 0.92
            }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 24, fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.12em" }, children: "KOVA" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "var(--text-3)", fontSize: 13, textAlign: "center", lineHeight: 1.8, maxWidth: 340 }, children: projectRoot ? "Ask, analyze, or request to create and fix code." : "Open a project to get started." }),
        !projectRoot && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onOpenFolder, style: {
          marginTop: 8,
          background: "var(--amber-dim)",
          color: "var(--amber)",
          border: "1px solid rgba(193,122,46,0.25)",
          padding: "8px 22px",
          borderRadius: 8,
          fontSize: 13
        }, children: "Open project" }),
        projectRoot && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8, marginTop: 4 }, children: [
          { label: "/plan — plan before coding", mode: "plan" },
          { label: "/review — read-only review", mode: "review" }
        ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onModeChange(item.mode), style: {
          fontSize: 11,
          padding: "5px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg-2)",
          color: "var(--text-3)",
          fontFamily: "var(--font-mono)"
        }, children: item.label }, item.mode)) })
      ] }),
      showTodoCard && /* @__PURE__ */ jsxRuntimeExports.jsx(TodoListCard, { todos }),
      messages.map(
        (msg) => msg.role === "user" ? /* @__PURE__ */ jsxRuntimeExports.jsx(UserBubble, { msg }, msg.id) : /* @__PURE__ */ jsxRuntimeExports.jsx(AssistantBubble, { msg }, msg.id)
      ),
      showResultCard && /* @__PURE__ */ jsxRuntimeExports.jsx(TaskResultCard, { executionState }),
      showLive && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 10, marginBottom: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        (reasoning.active || reasoning.text) && /* @__PURE__ */ jsxRuntimeExports.jsx(ReasoningPanel, { reasoning }),
        streamingText && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
          padding: "10px 14px",
          marginBottom: 6,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "2px 12px 12px 12px",
          color: "var(--text-1)",
          fontSize: 13.5,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        }, children: [
          streamingText,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
            display: "inline-block",
            width: 2,
            height: "1.1em",
            background: "var(--amber)",
            marginLeft: 2,
            animation: "pulse-amber 0.8s infinite",
            verticalAlign: "text-bottom"
          } })
        ] }),
        events.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityFeed, { events }),
        isActive2 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 6, display: "flex", alignItems: "center", gap: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-shimmer-text", style: { fontSize: 12, fontWeight: 500 }, children: contextualStatusLabel(executionState.status, events) }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: bottomRef })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px 14px", borderTop: "1px solid var(--border)", background: "var(--bg-1)", flexShrink: 0 }, children: [
      queuedMessages.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 8, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "var(--yellow)", fontSize: 11, fontWeight: 700 }, children: [
          queuedMessages.length,
          " queued"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--text-3)", fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: queuedMessages[0]?.content }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClearQueue, style: { background: "transparent", color: "var(--text-3)", fontSize: 11, padding: "1px 6px" }, children: "clear" })
      ] }),
      isNonDefaultMode && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
          fontSize: 11,
          padding: "2px 10px",
          borderRadius: 20,
          background: "var(--cyan-dim)",
          color: "var(--cyan)",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 5
        }, children: [
          "/",
          activeMode,
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onModeChange("patch"), style: { background: "transparent", color: "var(--cyan)", opacity: 0.7, padding: 0, fontSize: 12, lineHeight: 1, marginLeft: 2 }, title: "Exit mode", children: "✕" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "var(--text-3)" }, children: activeMode === "plan" ? "Plan mode — no file changes" : "Review mode — no file changes" })
      ] }),
      atRefs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }, children: atRefs.map((ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, padding: "1px 7px", borderRadius: 6, background: "var(--bg-3)", color: "var(--text-3)", fontFamily: "var(--font-mono)", border: "1px solid var(--border)" }, children: [
        "@ ",
        ref.split(/[/\\]/).pop()
      ] }, ref)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, children: [
        showSlash && /* @__PURE__ */ jsxRuntimeExports.jsx(SlashPalette, { query: value.trimStart(), onSelect: selectSlashCommand }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            multiple: true,
            accept: "image/*,text/*,application/pdf,application/json",
            onChange: onPickFiles,
            style: { display: "none" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              border: `1px solid ${isDragging ? "var(--cyan)" : "var(--border)"}`,
              borderRadius: 12,
              background: isDragging ? "var(--cyan-dim)" : "var(--bg-2)",
              overflow: "hidden",
              transition: "border-color 0.15s, background 0.15s"
            },
            onDrop,
            onDragOver,
            onDragLeave,
            children: [
              attachments.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
                display: "flex",
                gap: 8,
                padding: "10px 12px 0",
                flexWrap: "wrap",
                borderBottom: "1px solid var(--border)",
                paddingBottom: 10
              }, children: attachments.map((att, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(AttachmentChip, { attachment: att, onRemove: () => removeAttachment(idx) }, `${att.name}-${idx}`)) }),
              attachmentError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
                padding: "6px 14px",
                fontSize: 11,
                color: "var(--red)",
                background: "var(--red-dim)",
                borderBottom: "1px solid var(--border)"
              }, children: attachmentError }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "textarea",
                {
                  ref: textareaRef,
                  value,
                  onChange: (e) => setValue(e.target.value),
                  onKeyDown,
                  onPaste,
                  disabled: !projectRoot,
                  placeholder: !projectRoot ? "Open a project to get started..." : isRunning || isThinking ? "Message will be queued..." : isDragging ? "Drop files here..." : "Ask, analyze, or request code changes. Use @file or /plan, /review",
                  rows: 1,
                  style: {
                    width: "100%",
                    resize: "none",
                    background: "transparent",
                    border: "none",
                    padding: "12px 14px 6px",
                    outline: "none",
                    color: "var(--text-1)",
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    fontFamily: "inherit",
                    minHeight: 44
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", padding: "6px 10px 8px", gap: 6 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => fileInputRef.current?.click(),
                    disabled: !projectRoot,
                    title: supportsVision === false ? "Active model does not support images — text/PDF only" : "Attach files or images (drag-drop or paste also works)",
                    style: {
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      cursor: projectRoot ? "pointer" : "not-allowed",
                      transition: "background 0.15s, color 0.15s, border-color 0.15s"
                    },
                    onMouseEnter: (e) => {
                      if (projectRoot) {
                        e.currentTarget.style.borderColor = "var(--cyan)";
                        e.currentTarget.style.color = "var(--cyan)";
                      }
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-3)";
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 16 }, children: "add" })
                  }
                ),
                ["plan", "review"].map((mode) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => onModeChange(activeMode === mode ? "patch" : mode),
                    style: {
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontWeight: 500,
                      border: `1px solid ${activeMode === mode ? "rgba(93,202,165,0.4)" : "var(--border)"}`,
                      background: activeMode === mode ? "var(--cyan-dim)" : "transparent",
                      color: activeMode === mode ? "var(--cyan)" : "var(--text-3)",
                      transition: "all 0.15s",
                      fontFamily: "var(--font-mono)"
                    },
                    children: [
                      "/",
                      mode
                    ]
                  },
                  mode
                )),
                totalTokens > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }, children: [
                  totalTokens >= 1e3 ? `${(totalTokens / 1e3).toFixed(1)}k` : totalTokens,
                  " tk",
                  contextPct > 60 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: contextPct > 80 ? "var(--red)" : "var(--yellow)", marginLeft: 4 }, children: [
                    "· ",
                    contextPct,
                    "%"
                  ] })
                ] }),
                activeModel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }, children: activeModel.split("/").pop() }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1 } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: submit,
                    disabled: !value.trim() && attachments.length === 0 || !projectRoot,
                    style: {
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: (value.trim() || attachments.length > 0) && projectRoot ? "var(--cyan)" : "var(--bg-active)",
                      color: (value.trim() || attachments.length > 0) && projectRoot ? "#000" : "var(--text-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s, color 0.15s",
                      border: "none"
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "material-symbols-outlined", style: { fontSize: 17 }, children: "send" })
                  }
                )
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { marginTop: 5, fontSize: 10, color: "var(--text-ghost)", textAlign: "center" }, children: "Enter · Shift+Enter new line · @file includes context" })
    ] })
  ] });
}
function ServerSessionCard({ events }) {
  const session = [...events].reverse().find((event) => event.serverSession)?.serverSession;
  if (!session) return null;
  const tone = session.ready ? "pass" : session.diagnostics?.length ? "fail" : "warn";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section kova-server-session", "data-tone": tone, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Dev Server" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: session.ready ? "ready" : "starting" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-contract-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Port" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: session.port ?? "-" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Session" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: session.sessionId ?? "-" })
      ] })
    ] }),
    session.url && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-proof-next", children: session.url }),
    session.diagnostics?.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-proof-list danger", children: session.diagnostics.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: item }, item)) }) : null
  ] });
}
const PHASES = [
  { key: "contract", label: "Contract", events: ["contract_created"] },
  { key: "plan", label: "Plan", events: ["agent_started", "agent_completed"] },
  { key: "code", label: "Code", events: ["agent_started", "agent_completed"] },
  { key: "validate", label: "Validate", events: ["validation_started", "validation_completed"] },
  { key: "decide", label: "Decide", events: ["decision_made"] },
  { key: "apply", label: "Apply", events: ["apply_started", "apply_completed"] }
];
const LAYER_ORDER = ["completion", "build", "typecheck", "tests", "rules", "security", "lint"];
const LAYER_LABEL = {
  completion: "Completion",
  build: "Build",
  typecheck: "Typecheck",
  tests: "Tests",
  rules: "Rules",
  security: "Security",
  lint: "Lint"
};
const STATUS_COPY = {
  structuring: "Structuring",
  planning: "Planning",
  coding: "Coding",
  validating: "Validating",
  deciding: "Deciding",
  applying: "Applying",
  repairing: "Repairing",
  awaiting_approval: "Approval",
  server_starting: "Server",
  server_ready: "Server Ready",
  blocked: "Blocked",
  completed: "Completed",
  failed: "Failed",
  paused: "Review"
};
function statusTone(status) {
  if (status === "completed") return { color: "var(--teal)", bg: "var(--teal-dim)", label: "Ready" };
  if (status === "failed") return { color: "var(--red)", bg: "var(--red-dim)", label: "Failed" };
  if (status === "paused") return { color: "var(--yellow)", bg: "var(--yellow-dim)", label: "Review" };
  if (status) return { color: "var(--amber)", bg: "var(--amber-dim)", label: STATUS_COPY[status] ?? status };
  return { color: "var(--text-3)", bg: "var(--bg-active)", label: "Idle" };
}
function phaseState(phase, events, executionState) {
  const relevant = events.filter((event) => phase.events.includes(event.type));
  if (phase.key === "plan") {
    const started = events.some((event) => event.type === "agent_started" && event.mode === "plan");
    const done = events.some((event) => event.type === "agent_completed" && event.mode === "plan");
    const codeStarted = events.some((event) => event.type === "agent_started" && event.mode !== "plan");
    if (!started && codeStarted) return "skipped";
    return done ? "done" : started ? "running" : "idle";
  }
  if (phase.key === "code") {
    const started = events.some((event) => event.type === "agent_started" && event.mode !== "plan");
    const done = events.some((event) => event.type === "agent_completed" && event.mode !== "plan");
    return done ? "done" : started ? "running" : "idle";
  }
  if (phase.key === "validate") {
    const lastValidation = [...events].reverse().find((event) => event.type === "validation_completed");
    if (lastValidation?.harnessResult) return lastValidation.harnessResult.passed ? "done" : "failed";
    if (events.some((event) => event.type === "validation_started")) return "running";
    return "idle";
  }
  if (phase.key === "apply") {
    if (events.some((event) => event.type === "apply_completed")) return "done";
    if (events.some((event) => event.type === "apply_started")) return "running";
    if (executionState?.iterationHistory?.length && executionState.status !== "completed") return "skipped";
    return "idle";
  }
  if (phase.key === "contract" && executionState) return "done";
  return relevant.length > 0 ? "done" : "idle";
}
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1e3));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
function useTicker(active) {
  const [now, setNow] = reactExports.useState(Date.now());
  React.useEffect(() => {
    if (!active) {
      setNow(Date.now());
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1e3);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}
function ScoreRing({ score }) {
  const radius = 29;
  const circle = 2 * Math.PI * radius;
  const color = score >= 90 ? "var(--teal)" : score >= 70 ? "var(--yellow)" : score > 0 ? "var(--red)" : "var(--text-ghost)";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "kova-score-ring", viewBox: "0 0 76 76", "aria-label": `Score ${score}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "38", cy: "38", r: radius, fill: "none", stroke: "var(--bg-active)", strokeWidth: "6" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "circle",
      {
        cx: "38",
        cy: "38",
        r: radius,
        fill: "none",
        stroke: color,
        strokeWidth: "6",
        strokeLinecap: "round",
        strokeDasharray: `${score / 100 * circle} ${circle}`,
        transform: "rotate(-90 38 38)"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: "38", y: "38", textAnchor: "middle", dominantBaseline: "middle", fill: color, fontSize: "16", fontWeight: "800", children: score })
  ] });
}
function PhaseRail({ events, executionState }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-phase-rail", children: PHASES.map((phase) => {
    const state = phaseState(phase, events, executionState);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `kova-phase ${state}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-phase-dot" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: phase.label })
    ] }, phase.key);
  }) });
}
function LayerPill({ layer }) {
  const [open, setOpen] = reactExports.useState(false);
  const tone = layer.skipped ? "idle" : layer.passed ? "pass" : "fail";
  const duration = layer.durationMs ?? layer.duration;
  const canOpen = layer.errors.length > 0 || !!layer.command || !!layer.stdout || !!layer.stderr || !!layer.cwd || !!layer.skippedReason;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `kova-layer ${tone}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "kova-layer-button", onClick: () => setOpen((v) => !v), disabled: !canOpen, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-layer-dot" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-layer-name", children: LAYER_LABEL[layer.name] ?? layer.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-layer-meta", children: layer.skipped ? "skip" : layer.passed ? formatDuration(duration) : `${layer.errors.length} err - ${formatDuration(duration)}` })
    ] }),
    open && canOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-layer-detail", children: [
      layer.cwd && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-layer-cwd", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "cwd" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: layer.cwd })
      ] }),
      layer.skippedReason && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-layer-skip", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "skipped" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: layer.skippedReason })
      ] }),
      layer.command && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-layer-command", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "command" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: layer.command }),
        typeof layer.exitCode === "number" && /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          "exit ",
          layer.exitCode
        ] })
      ] }),
      layer.errors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-layer-errors", children: layer.errors.slice(0, 4).map((error, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorLine, { error }, index)) }),
      (layer.stderr || layer.stdout) && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "kova-layer-output", children: (layer.stderr || layer.stdout || "").slice(0, 2500) })
    ] })
  ] });
}
function ErrorLine({ error }) {
  const file = error.file ? `${error.file.split("/").at(-1)}${error.line ? `:${error.line}` : ""}` : "harness";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-error-line", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: file }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: error.humanMessage || error.message })
  ] });
}
function FindingRow({ finding }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `kova-finding ${finding.blocking ? "blocking" : "notice"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: finding.category }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: finding.message })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: finding.severity })
  ] });
}
function EventRow({ event }) {
  const label = event.message ?? event.type.replace(/_/g, " ");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-event-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(event.timestamp) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: label })
  ] });
}
function ContextEvidenceCard({ sessionUsage }) {
  const selected = sessionUsage.selectedFiles ?? [];
  const blocked = sessionUsage.blockedFiles ?? [];
  const rejected = sessionUsage.rejectedFiles ?? [];
  const warnings = sessionUsage.contextWarnings ?? [];
  if (selected.length === 0 && blocked.length === 0 && rejected.length === 0 && warnings.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section kova-context-evidence", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Context Pack" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
        selected.length,
        " used"
      ] })
    ] }),
    selected.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-context-card-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-mini-title", children: "Files used" }),
      selected.slice(0, 6).map((file) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-context-file used", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: file.path }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: file.reason })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: file.score })
      ] }, file.path))
    ] }),
    blocked.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-context-card-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-mini-title danger", children: "Blocked" }),
      blocked.slice(0, 4).map((file) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-context-file blocked", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: file.path }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: file.reason })
      ] }) }, file.path))
    ] }),
    rejected.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-context-card-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-mini-title muted", children: "Rejected" }),
      rejected.slice(0, 4).map((file) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-context-file rejected", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: file.path }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: file.reason })
        ] }),
        typeof file.score === "number" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: file.score })
      ] }, `${file.path}:${file.reason}`))
    ] }),
    warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-context-warnings", children: warnings.slice(0, 3).map((warning) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: warning }, warning)) })
  ] });
}
function EvidenceScoreCard({ last }) {
  const evidence = last?.harnessResult.evidenceScore;
  if (!evidence) return null;
  const tone = evidence.score >= 90 ? "pass" : evidence.score >= 70 ? "warn" : "fail";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section kova-evidence-score", "data-tone": tone, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Evidence Score" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: evidence.score })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-evidence-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Confidence" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: evidence.validationConfidence })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Validations" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          evidence.validation.passedLayers.length,
          "/",
          evidence.validation.executedLayers.length
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Risk" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: evidence.risk.riskLevel })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Patch" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: evidence.risk.patchSize })
      ] })
    ] }),
    (evidence.blockers.length > 0 || evidence.notes.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-evidence-notes", children: [...evidence.blockers, ...evidence.notes].slice(0, 5).map((note) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: note }, note)) })
  ] });
}
function ProofPackCard({ executionState }) {
  const proof = executionState?.proofPack;
  if (!proof) return null;
  const failed = proof.validationsRun.filter((validation) => !validation.passed && !validation.skipped);
  const tone = proof.finalUiDecision === "apply" ? "pass" : proof.finalUiDecision === "repair_needed" || proof.finalUiDecision === "reject" ? "fail" : "warn";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section kova-proof-pack", "data-tone": tone, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Proof Pack" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: proof.finalUiDecision ?? proof.finalDecision })
    ] }),
    proof.summary && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-proof-summary", children: proof.summary }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-evidence-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Score" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: proof.finalScore })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Confidence" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: proof.results?.validationConfidence ?? "-" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Validations" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          proof.validationsRun.filter((v) => v.passed).length,
          "/",
          proof.validationsRun.length
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Files" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: proof.diffSummary?.filesChanged ?? proof.changes.length })
      ] })
    ] }),
    failed.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-proof-list danger", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-mini-title danger", children: "Falhas reais" }),
      failed.slice(0, 3).map((validation) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        validation.command ?? validation.kind,
        " - ",
        validation.note ?? "failed"
      ] }, `${validation.kind}:${validation.command ?? validation.note}`))
    ] }),
    proof.validationsNotRun.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-proof-list", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-mini-title muted", children: "Not run" }),
      proof.validationsNotRun.slice(0, 4).map((validation) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        validation.kind,
        ": ",
        validation.reason
      ] }, `${validation.kind}:${validation.reason}`))
    ] }),
    proof.residualRisk.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-proof-list", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-mini-title muted", children: "Riscos" }),
      proof.residualRisk.slice(0, 4).map((risk) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: risk }, risk))
    ] }),
    proof.nextStepRecommended && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-proof-next", children: proof.nextStepRecommended })
  ] });
}
function HarnessDashboard({ executionState, events, sessionUsage, isThinking, onViewDiff, onPause, onAbort, onApply, onRepair }) {
  const [tab, setTab] = reactExports.useState("timeline");
  const last = executionState?.iterationHistory?.at(-1) ?? null;
  const status = executionState?.status ?? null;
  const isRunning = isThinking || !!status && !["completed", "failed", "paused"].includes(status);
  const now = useTicker(isRunning);
  const hasWrite = reactExports.useMemo(() => events.some((e) => e.type === "tool_call" && (e.toolName === "write_file" || e.toolName === "run_command")), [events]);
  const hasRead = reactExports.useMemo(() => events.some((e) => e.type === "tool_call" && (e.toolName === "read_file" || e.toolName === "list_files")), [events]);
  const changes = last?.changes ?? [];
  let uxMode = "Chat";
  if (hasWrite || changes.length > 0) uxMode = "Task";
  else if (hasRead) uxMode = "Review";
  const decision = last?.decision ?? null;
  const score = decision?.score ?? last?.harnessResult.score ?? 0;
  const review = decision?.reviewGate ?? null;
  const contract = [...events].reverse().find((event) => event.contract)?.contract ?? null;
  const isPaused = status === "paused";
  const failedLayers = last?.harnessResult.layers.filter((layer) => !layer.skipped && !layer.passed) ?? [];
  const needsRepair = status === "failed" && failedLayers.some((layer) => ["build", "typecheck", "tests", "lint"].includes(layer.name));
  const currentIteration = executionState?.iterationHistory?.length ?? 0;
  const maxIterations = executionState?.maxIterations ?? 5;
  const isRepairLoop = isRunning && currentIteration > 1;
  const meaningfulEvents = reactExports.useMemo(() => events.filter(
    (e) => e.type !== "token" && e.type !== "stream_end" && e.type !== "reasoning_start" && e.type !== "reasoning_delta" && e.type !== "reasoning_end"
  ), [events]);
  const latestEvents = reactExports.useMemo(() => meaningfulEvents.slice(-20).reverse(), [meaningfulEvents]);
  const totalTokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens);
  const proofFiles = executionState?.proofPack?.analyzedFiles?.length ?? 0;
  const visibleContextFiles = Math.max(sessionUsage.contextFiles.length, proofFiles, changes.length);
  const elapsedMs = executionState?.startedAt ? now - new Date(executionState.startedAt).getTime() : 0;
  const contextPercent = sessionUsage.maxContextTokens ? Math.min(100, Math.round(sessionUsage.contextTokens / sessionUsage.maxContextTokens * 100)) : null;
  let heroLabel = "Idle";
  let heroColor = "var(--text-3)";
  let heroBg = "var(--bg-active)";
  let heroSub = "Waiting for a task.";
  if (uxMode === "Chat") {
    if (isRunning) {
      heroLabel = "Chatting";
      heroColor = "var(--purple)";
      heroBg = "var(--purple-dim)";
      heroSub = "Processing request...";
    }
  } else if (uxMode === "Review") {
    if (isRunning) {
      heroLabel = "Reviewing";
      heroColor = "var(--blue)";
      heroBg = "var(--blue-dim)";
      heroSub = "Reading files and preparing analysis...";
    } else {
      heroLabel = "Review complete";
      heroColor = "var(--teal)";
      heroBg = "var(--teal-dim)";
      heroSub = "No changes applied.";
    }
  } else if (uxMode === "Task") {
    const tone = statusTone(status);
    heroLabel = tone.label;
    heroColor = tone.color;
    heroBg = tone.bg;
    heroSub = decision?.reason ?? "Running changes and validation...";
    if (isRepairLoop) {
      heroLabel = `Repair ${currentIteration}/${maxIterations}`;
      heroColor = "var(--amber)";
      heroBg = "var(--amber-dim)";
      const failing = failedLayers.map((layer) => LAYER_LABEL[layer.name] ?? layer.name).join(", ");
      heroSub = failing ? `Fixing: ${failing}` : "Applying fix...";
    }
    if (needsRepair) {
      heroLabel = "Repair needed";
      heroColor = "var(--red)";
      heroBg = "var(--red-dim)";
      heroSub = `${failedLayers.map((layer) => LAYER_LABEL[layer.name] ?? layer.name).join(", ")} failed; needs another fix.`;
    }
  }
  if (uxMode === "Chat" && !isRunning && meaningfulEvents.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "kova-run-panel", style: { justifyContent: "center", alignItems: "center", opacity: 0.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 13, color: "var(--text-3)" }, children: "No active task" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "kova-run-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-run-hero", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: heroColor, padding: "2px 6px", background: heroBg, borderRadius: 4 }, children: [
          "Mode ",
          uxMode
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { style: { color: heroColor }, children: heroLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: heroSub })
      ] }),
      uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsx(ScoreRing, { score })
    ] }),
    uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsx(PhaseRail, { events, executionState }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-run-tabs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: tab === "timeline" ? "active" : "", onClick: () => setTab("timeline"), children: "Timeline" }),
      uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: tab === "run" ? "active" : "", onClick: () => setTab("run"), children: "Run" }),
      uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: tab === "review" ? "active" : "", onClick: () => setTab("review"), children: "Review" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: tab === "events" ? "active" : "", onClick: () => setTab("events"), children: "Debug" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-run-body", children: [
      (tab === "timeline" || tab === "events") && (sessionUsage.contextTokens > 0 || totalTokens > 0 || visibleContextFiles > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Context" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: contextPercent !== null ? `${contextPercent}%` : "-" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-contract-grid", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Files" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: visibleContextFiles })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Context" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
              (sessionUsage.contextTokens / 1e3).toFixed(1),
              "k"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: totalTokens >= 1e3 ? `${(totalTokens / 1e3).toFixed(1)}k` : totalTokens })
          ] }),
          executionState && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Duration" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatDuration(elapsedMs) })
          ] })
        ] })
      ] }),
      (tab === "timeline" || tab === "events") && /* @__PURE__ */ jsxRuntimeExports.jsx(ContextEvidenceCard, { sessionUsage }),
      (tab === "timeline" || tab === "run") && /* @__PURE__ */ jsxRuntimeExports.jsx(ServerSessionCard, { events }),
      tab === "timeline" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Timeline" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: meaningfulEvents.length })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-event-list", children: [
          latestEvents.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-muted", children: "No actions yet." }),
          latestEvents.map((event, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(EventRow, { event }, `${event.timestamp}:timeline:${index}`))
        ] })
      ] }),
      tab === "run" && uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Harness" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: last ? `${last.harnessResult.layers.filter((layer) => layer.passed && !layer.skipped).length}/${last.harnessResult.layers.filter((layer) => !layer.skipped).length}` : "-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-layer-stack", children: LAYER_ORDER.map((name) => {
            const layer = last?.harnessResult.layers.find((item) => item.name === name);
            return layer ? /* @__PURE__ */ jsxRuntimeExports.jsx(LayerPill, { layer }, name) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kova-layer idle", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-layer-button", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-layer-dot" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-layer-name", children: LAYER_LABEL[name] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kova-layer-meta", children: "idle" })
            ] }) }, name);
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(EvidenceScoreCard, { last }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Files" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: changes.length })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-file-list", children: [
            changes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-muted", children: "No files changed." }),
            changes.slice(0, 6).map((change) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-file-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: change.type }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: change.path.split("/").at(-1) })
            ] }, `${change.type}:${change.path}`))
          ] })
        ] })
      ] }),
      tab === "review" && uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ProofPackCard, { executionState }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Contract" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: contract ? contract.stackAdapter : "-" })
          ] }),
          contract ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-contract-grid", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Max files" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: contract.maxFilesChanged })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Tests" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: contract.requiresTests ? "required" : "optional" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Scope" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: contract.allowedPaths.slice(0, 2).join(", ") || "**" })
            ] })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-muted", children: "Created when task starts." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Review Gate" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: review?.passed ? "var(--teal)" : review ? "var(--yellow)" : "var(--text-3)" }, children: review ? review.passed ? "pass" : "hold" : "-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-findings", children: [
            !review && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-muted", children: "Waiting for validation." }),
            review?.findings.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-muted", children: "No findings." }),
            review?.findings.map((finding, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(FindingRow, { finding }, index))
          ] })
        ] })
      ] }),
      tab === "events" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "kova-panel-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-section-title", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Debug / Raw Events" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: meaningfulEvents.length })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-event-list", children: [
          latestEvents.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kova-muted", children: "No events recorded." }),
          latestEvents.map((event, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(EventRow, { event }, `${event.timestamp}:${index}`))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-run-actions", children: [
      isPaused && changes.length > 0 && uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
        padding: "12px 14px",
        background: "var(--yellow-dim)",
        border: "1px solid var(--yellow)",
        borderRadius: 6,
        marginBottom: 10
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--yellow)", marginBottom: 4 }, children: [
          changes.length,
          " file",
          changes.length === 1 ? "" : "s",
          " ready to apply"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }, children: decision?.reason ?? "Review and apply to write these files to disk." })
      ] }),
      needsRepair && onRepair && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "primary repair", onClick: onRepair, children: "Fix failures" }),
      isPaused && uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          className: "primary",
          onClick: onApply,
          style: {
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 16px",
            background: "var(--teal)",
            color: "var(--bg-0)",
            width: "100%"
          },
          children: [
            "Apply ",
            changes.length > 0 ? `${changes.length} file${changes.length === 1 ? "" : "s"}` : "changes",
            " to disk"
          ]
        }
      ),
      onViewDiff && uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "secondary", onClick: onViewDiff, children: "Review files" }),
      isRunning && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kova-action-row", children: [
        uxMode === "Task" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "secondary", onClick: onPause, children: "Pause" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "danger", onClick: onAbort, children: "Cancel" })
      ] })
    ] })
  ] });
}
const TYPE_META = {
  create: { label: "New", color: "var(--teal)", bg: "var(--teal-dim)" },
  modify: { label: "Modified", color: "var(--yellow)", bg: "var(--yellow-dim)" },
  delete: { label: "Deleted", color: "var(--red)", bg: "var(--red-dim)" }
};
const LINE_BG = {
  add: "rgba(93,202,165,0.08)",
  remove: "rgba(226,75,74,0.08)",
  same: "transparent"
};
const LINE_MARKER_COLOR = {
  add: "rgba(93,202,165,0.65)",
  remove: "rgba(226,75,74,0.75)",
  same: "transparent"
};
const LINE_MARKER = { add: "+", remove: "-", same: " " };
function diffLines(before, after) {
  if (before.length * after.length > 3e5) {
    return after.map((text) => ({ text, type: "add" }));
  }
  const m = before.length, n = after.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i2 = 1; i2 <= m; i2++) {
    for (let j2 = 1; j2 <= n; j2++) {
      dp[i2][j2] = before[i2 - 1] === after[j2 - 1] ? dp[i2 - 1][j2 - 1] + 1 : Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
    }
  }
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      result.unshift({ text: before[i - 1], type: "same" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: after[j - 1], type: "add" });
      j--;
    } else {
      result.unshift({ text: before[i - 1], type: "remove" });
      i--;
    }
  }
  return result;
}
function buildDiffLines(change) {
  if (change.type === "delete") {
    return (change.before ?? "").split("\n").map((text, index) => ({ text, type: "remove", hunkId: `${change.path}:remove:${index + 1}` }));
  }
  if (change.type === "create" || !change.before) {
    return (change.diff ?? "").split("\n").map((text, index) => ({ text, type: "add", hunkId: `${change.path}:add:${index + 1}` }));
  }
  let changeIndex = 0;
  return diffLines(change.before.split("\n"), (change.diff ?? "").split("\n")).map((line) => {
    if (line.type === "same") return line;
    changeIndex += 1;
    return { ...line, hunkId: `${change.path}:${line.type}:${changeIndex}` };
  });
}
function FileIcon({ name }) {
  const { label, color } = fileIconInfo(name);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
    width: 26,
    height: 26,
    borderRadius: 4,
    flexShrink: 0,
    background: `${color}22`,
    border: `1px solid ${color}44`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8,
    fontWeight: 700,
    color,
    letterSpacing: "-0.02em"
  }, children: label });
}
function FileEntry({ change, isSelected, onClick }) {
  const name = getFileName(change.path);
  const folder = getFolder(change.path);
  const e = getExt(change.path);
  const meta = TYPE_META[change.type];
  const lines = (change.diff ?? change.before ?? "").split("\n").length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick, style: {
    width: "100%",
    textAlign: "left",
    padding: "8px 12px",
    background: isSelected ? "var(--bg-active)" : "transparent",
    borderLeft: isSelected ? "2px solid var(--amber)" : "2px solid transparent",
    borderRadius: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid var(--border)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(FileIcon, { name }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 600, color: isSelected ? "var(--amber)" : "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: meta.color, background: meta.bg, padding: "1px 6px", borderRadius: 10, flexShrink: 0 }, children: meta.label })
      ] }),
      folder && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "var(--text-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
        folder,
        "/"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "var(--text-3)", marginTop: 2 }, children: [
        EXT_LANG[e] ?? e.toUpperCase(),
        " · ",
        lines,
        " linha",
        lines !== 1 ? "s" : ""
      ] })
    ] })
  ] });
}
function CodeView({
  change,
  approvedHunks,
  onToggleHunk
}) {
  const name = getFileName(change.path);
  const e = getExt(change.path);
  const diffed = buildDiffLines(change);
  const hasRealDiff = change.type === "modify" && change.before !== void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflow: "auto", background: "var(--bg-1)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 14px", background: "var(--bg-3)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileIcon, { name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text-1)", fontFamily: "var(--font-mono)" }, children: change.path }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { marginLeft: 10, fontSize: 10, color: "var(--text-3)" }, children: [
          EXT_LANG[e] ?? e,
          hasRealDiff && ` · diff`,
          !hasRealDiff && ` · ${diffed.length} linhas`
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.65 }, children: diffed.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", background: LINE_BG[line.type] }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { minWidth: 44, padding: "0 10px 0 8px", color: "var(--text-ghost)", userSelect: "none", textAlign: "right", flexShrink: 0 }, children: line.type !== "remove" ? i + 1 : "" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: LINE_MARKER_COLOR[line.type], width: 14, flexShrink: 0, userSelect: "none", textAlign: "center" }, children: LINE_MARKER[line.type] }),
      line.hunkId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: approvedHunks.has(line.hunkId),
          onChange: () => onToggleHunk(line.hunkId),
          title: "Aprovar este trecho",
          style: { width: 18, flexShrink: 0, margin: "3px 6px 0 0" }
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { width: 24, flexShrink: 0 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--text-2)", whiteSpace: "pre", flex: 1, padding: "0 8px" }, children: line.text })
    ] }, i)) })
  ] });
}
function FilesViewer({ changes, onClose, onApplySelection }) {
  const [selected, setSelected] = reactExports.useState(0);
  const [fileDecisions, setFileDecisions] = reactExports.useState(
    () => Object.fromEntries(changes.map((change) => [change.path, "approve"]))
  );
  const [approvedHunks, setApprovedHunks] = reactExports.useState(
    () => Object.fromEntries(changes.map((change) => [change.path, buildDiffLines(change).map((line) => line.hunkId).filter(Boolean)]))
  );
  const active = changes[selected];
  const activeApproved = new Set(active ? approvedHunks[active.path] ?? [] : []);
  const selection = {
    files: changes.map((change) => ({
      path: change.path,
      decision: fileDecisions[change.path] ?? "approve",
      approvedHunkIds: approvedHunks[change.path] ?? []
    }))
  };
  function setDecision(path, decision) {
    setFileDecisions((prev) => ({ ...prev, [path]: decision }));
  }
  function toggleHunk(path, id) {
    setFileDecisions((prev) => ({ ...prev, [path]: "partial" }));
    setApprovedHunks((prev) => {
      const current = new Set(prev[path] ?? []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      return { ...prev, [path]: [...current] };
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { height: 360, display: "flex", flexDirection: "column", background: "var(--bg-2)", borderTop: "1px solid var(--border)", flexShrink: 0 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-3)", gap: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }, children: "Generated files" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "var(--text-3)", background: "var(--bg-active)", padding: "1px 8px", borderRadius: 10 }, children: changes.length }),
      active && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDecision(active.path, "approve"), style: { marginLeft: "auto", fontSize: 11 }, children: "Approve file" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDecision(active.path, "reject"), style: { fontSize: 11 }, children: "Reject file" }),
        onApplySelection && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onApplySelection(selection), style: { fontSize: 11, color: "var(--teal)" }, children: "Apply approved" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, style: { marginLeft: "auto", background: "transparent", color: "var(--text-3)", padding: "2px 8px", fontSize: 14 }, children: "✕" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flex: 1, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 220, borderRight: "1px solid var(--border)", overflow: "auto", flexShrink: 0 }, children: changes.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(FileEntry, { change: c, isSelected: i === selected, onClick: () => setSelected(i) }, i)) }),
      active ? /* @__PURE__ */ jsxRuntimeExports.jsx(CodeView, { change: active, approvedHunks: activeApproved, onToggleHunk: (id) => toggleHunk(active.path, id) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }, children: "Select a file" })
    ] })
  ] });
}
function folderPath(path) {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}
function FileEditor({ path, onClose }) {
  const [content, setContent] = reactExports.useState(null);
  const [editContent, setEditContent] = reactExports.useState("");
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [isDirty, setIsDirty] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  reactExports.useEffect(() => {
    setContent(null);
    setError("");
    setIsEditing(false);
    setIsDirty(false);
    window.kova.readFile(path).then((c) => {
      if (c !== null) {
        setContent(c);
        setEditContent(c);
      } else setError("File not found or missing read permission");
    });
  }, [path]);
  const startEdit = reactExports.useCallback(() => {
    setEditContent(content ?? "");
    setIsEditing(true);
  }, [content]);
  const save = reactExports.useCallback(async () => {
    setIsSaving(true);
    setError("");
    try {
      await window.kova.writeFile(path, editContent);
      setContent(editContent);
      setIsEditing(false);
      setIsDirty(false);
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : "permission denied or disk full"}`);
    } finally {
      setIsSaving(false);
    }
  }, [path, editContent]);
  const cancel = reactExports.useCallback(() => {
    setEditContent(content ?? "");
    setIsEditing(false);
    setIsDirty(false);
    setError("");
  }, [content]);
  const e = getExt(path);
  const name = getFileName(path);
  const { label: iconLabel, color } = fileIconInfo(name);
  const lines = (isEditing ? editContent : content ?? "").split("\n");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-1)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "var(--bg-3)", borderBottom: "1px solid var(--border)", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 24, height: 24, borderRadius: 3, background: `${color}22`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color, flexShrink: 0 }, children: iconLabel }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text-1)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
          name,
          " ",
          isDirty && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--yellow)" }, children: "●" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "var(--text-3)" }, children: [
          EXT_LANG[e] ?? e.toUpperCase(),
          folderPath(path) && ` · ${folderPath(path)}`
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
        !isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: startEdit, style: { background: "var(--bg-active)", color: "var(--text-2)", padding: "4px 10px", fontSize: 11, borderRadius: 4 }, children: "✏ Editar" }),
        isEditing && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "var(--amber)", background: "var(--amber-dim)", padding: "2px 8px", borderRadius: 10, fontWeight: 600, letterSpacing: "0.04em" }, children: "EDIT" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: cancel, style: { background: "transparent", color: "var(--text-3)", padding: "4px 10px", fontSize: 11 }, children: "Cancelar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: save, disabled: isSaving, style: { background: "var(--teal)", color: "#000", padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 4 }, children: isSaving ? "..." : "✓ Salvar" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, style: { background: "transparent", color: "var(--text-3)", padding: "4px 8px", fontSize: 14 }, children: "✕" })
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "10px 14px", color: "var(--red)", fontSize: 12, borderBottom: "1px solid var(--border)", background: "var(--red-dim)" }, children: error }),
    !error && content === null && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }, children: "Carregando..." }),
    !error && content !== null && !isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflow: "auto", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.65 }, children: lines.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: { display: "flex" },
        onMouseEnter: (e2) => {
          e2.currentTarget.style.background = "var(--bg-hover)";
        },
        onMouseLeave: (e2) => {
          e2.currentTarget.style.background = "transparent";
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { minWidth: 44, padding: "0 10px 0 8px", color: "var(--text-ghost)", userSelect: "none", textAlign: "right", flexShrink: 0, borderRight: "1px solid var(--border)" }, children: i + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "0 12px", color: "var(--text-2)", whiteSpace: "pre", flex: 1 }, children: line })
        ]
      },
      i
    )) }),
    !error && isEditing && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        value: editContent,
        onChange: (e2) => {
          setEditContent(e2.target.value);
          setIsDirty(true);
        },
        spellCheck: false,
        style: {
          flex: 1,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.65,
          background: "var(--bg-1)",
          color: "var(--text-1)",
          border: "none",
          padding: "8px 12px",
          resize: "none",
          outline: "none",
          borderTop: "2px solid var(--amber)"
        }
      }
    )
  ] });
}
const STATUS_COLOR = {
  structuring: "var(--amber)",
  planning: "var(--amber)",
  coding: "var(--amber)",
  validating: "var(--yellow)",
  deciding: "var(--yellow)",
  applying: "var(--teal)",
  completed: "var(--teal)",
  repairing: "var(--amber)",
  awaiting_approval: "var(--yellow)",
  server_starting: "var(--cyan)",
  server_ready: "var(--teal)",
  blocked: "var(--red)",
  failed: "var(--red)",
  paused: "var(--text-3)"
};
function StatusBar({ executionState, sessionUsage, events }) {
  const status = executionState?.status ?? null;
  const last = executionState?.iterationHistory?.at(-1) ?? null;
  const pendingChanges = status === "paused" ? last?.changes.length ?? 0 : 0;
  const isActive2 = !!status && !["completed", "failed", "paused"].includes(status);
  const liveLabel = isActive2 && events && events.length > 0 ? contextualStatusLabel(status, events) : null;
  const server = events ? [...events].reverse().find((event) => event.serverSession)?.serverSession : null;
  const tokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens);
  const contextPercent = sessionUsage.maxContextTokens ? Math.min(100, Math.round(sessionUsage.contextTokens / sessionUsage.maxContextTokens * 100)) : null;
  const cacheTokens = sessionUsage.cacheReadInputTokens;
  const tokenLabel = tokens >= 1e6 ? `${(tokens / 1e6).toFixed(1)}M tokens` : tokens > 0 ? `${(tokens / 1e3).toFixed(1)}k tokens` : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { height: 28, background: "var(--bg-3)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 14px", gap: 16, flexShrink: 0 }, children: [
    status && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[status] ?? "var(--text-3)", animation: isActive2 ? "pulse-amber 1.5s infinite" : "none" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: STATUS_COLOR[status] ?? "var(--text-3)" }, children: status })
    ] }),
    liveLabel && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        style: {
          fontSize: 11,
          color: "var(--text-2)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 360
        },
        title: liveLabel,
        children: liveLabel
      }
    ),
    executionState && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "var(--text-3)" }, children: [
      "iter ",
      executionState.currentIteration + 1,
      "/",
      executionState.maxIterations
    ] }),
    last?.harnessResult && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: last.harnessResult.score >= 90 ? "var(--teal)" : last.harnessResult.score >= 70 ? "var(--yellow)" : "var(--text-3)" }, children: [
      "score ",
      last.harnessResult.score
    ] }),
    pendingChanges > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--yellow)",
      padding: "2px 8px",
      background: "var(--yellow-dim)",
      borderRadius: 10,
      animation: "pulse-amber 2s infinite"
    }, children: [
      pendingChanges,
      " awaiting apply"
    ] }),
    server?.ready && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "var(--cyan)" }, children: [
      "server ",
      server.url ?? server.port ?? "ready"
    ] }),
    tokenLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }, children: tokenLabel }),
    cacheTokens > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "var(--teal)" }, children: [
      "cache ",
      (cacheTokens / 1e3).toFixed(1),
      "k"
    ] }),
    contextPercent !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "var(--text-3)", marginLeft: tokenLabel ? 0 : "auto" }, children: [
      "context ",
      contextPercent,
      "%"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "var(--text-ghost)", marginLeft: tokenLabel || contextPercent !== null ? 0 : "auto" }, children: [
      "KOVA v",
      "0.1.0"
    ] })
  ] });
}
const PROVIDERS = [
  { value: "lmstudio", label: "LM Studio", description: "Local OpenAI-compatible server", local: true },
  { value: "ollama", label: "Ollama", description: "Local Ollama server", local: true },
  { value: "anthropic", label: "Anthropic Claude", description: "Claude API models", local: false },
  { value: "openai", label: "OpenAI", description: "OpenAI API models", local: false },
  { value: "gemini", label: "Google Gemini", description: "Gemini OpenAI-compatible endpoint", local: false },
  { value: "deepseek", label: "DeepSeek", description: "DeepSeek API models", local: false },
  { value: "kimi", label: "Kimi (Moonshot)", description: "Moonshot Kimi K2.x models", local: false },
  { value: "xai", label: "xAI (Grok)", description: "Grok 4 family", local: false },
  { value: "openrouter", label: "OpenRouter", description: "Router for Claude, GPT, Gemini and OSS models", local: false },
  { value: "nvidia", label: "NVIDIA Kimi K2.6", description: "NVIDIA hosted Kimi endpoint", local: false },
  { value: "openai-compatible", label: "OpenAI Compatible", description: "Custom compatible endpoint", local: false }
];
const HINTS = {
  lmstudio: "Abra LM Studio > Local Server > carregue um modelo > Start Server.",
  ollama: "Instale Ollama (ollama.ai) e rode: ollama pull qwen2.5-coder:7b",
  anthropic: "console.anthropic.com → API Keys. Selecione o modelo no dropdown.",
  openai: "platform.openai.com → API Keys. GPT-5.x recomendado.",
  deepseek: "platform.deepseek.com → API Keys. Modelos: deepseek-chat (V3.2) ou deepseek-reasoner (R1).",
  gemini: "aistudio.google.com → Get API Key. Usa o endpoint OpenAI-compatible do Google.",
  openrouter: "openrouter.ai → Keys. Suporta Claude, GPT, Gemini, Llama e outros modelos.",
  kimi: "platform.moonshot.ai → API Keys.",
  xai: "console.x.ai → API Keys. Grok 4 e variantes fast/code.",
  nvidia: "build.nvidia.com → Kimi K2.6 → Get API Key.",
  "openai-compatible": "Qualquer API compativel com OpenAI: Groq, Together, Fireworks, LM Studio remoto. Informe URL e modelo."
};
const API_KEY_CONFIG = {
  anthropic: { label: "Anthropic API Key", placeholder: "sk-ant-api03-...", key: "anthropicKey" },
  openai: { label: "OpenAI API Key", placeholder: "sk-proj-...", key: "openaiKey" },
  deepseek: { label: "DeepSeek API Key", placeholder: "sk-...", key: "deepseekKey" },
  gemini: { label: "Google Gemini API Key", placeholder: "AIza...", key: "geminiKey" },
  openrouter: { label: "OpenRouter API Key", placeholder: "sk-or-v1-...", key: "openrouterKey" },
  kimi: { label: "Kimi / Moonshot Key", placeholder: "sk-...", key: "kimiKey" },
  xai: { label: "xAI API Key", placeholder: "xai-...", key: "xaiKey" },
  nvidia: { label: "NVIDIA API Key", placeholder: "nvapi-...", key: "nvidiaKey" },
  "openai-compatible": { label: "API Key (optional)", placeholder: "leave empty when not required", key: "openaiCompatibleKey" }
};
const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5.5",
  deepseek: "deepseek-chat",
  gemini: "gemini-3-flash-preview",
  openrouter: "anthropic/claude-sonnet-4-6",
  kimi: "kimi-k2.6",
  xai: "grok-4",
  nvidia: "moonshotai/kimi-k2.6"
};
const KNOWN_MODELS = {
  anthropic: [
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022"
  ],
  openai: [
    "gpt-5.5",
    "gpt-5.5-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.2-codex",
    "gpt-4.1",
    "gpt-4o"
  ],
  gemini: [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash"
  ],
  kimi: [
    "kimi-k2.6",
    "kimi-k2.6-thinking",
    "kimi-k2.5",
    "kimi-k2"
  ],
  deepseek: [
    "deepseek-chat",
    "deepseek-reasoner"
  ],
  xai: [
    "grok-4",
    "grok-4.1",
    "grok-4-fast-reasoning",
    "grok-4-fast-non-reasoning",
    "grok-code-fast-1"
  ],
  openrouter: [
    "anthropic/claude-opus-4-7",
    "anthropic/claude-sonnet-4-6",
    "openai/gpt-5.5",
    "google/gemini-3.1-pro-preview",
    "google/gemini-3-flash-preview",
    "deepseek/deepseek-chat",
    "deepseek/deepseek-reasoner",
    "moonshotai/kimi-k2.6",
    "x-ai/grok-4",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen2.5-72b-instruct"
  ],
  nvidia: [
    "moonshotai/kimi-k2.6"
  ]
};
const FIELD = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 13,
  background: "var(--bg-3)",
  border: "1px solid var(--border)",
  color: "var(--text-1)"
};
function Field({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }, children: label }),
    children
  ] });
}
function serverUrl(form) {
  if (form.defaultProvider === "ollama") return form.ollamaUrl;
  if (form.defaultProvider === "lmstudio" || form.defaultProvider === "openai-compatible") return form.compatibleUrl;
  return "";
}
function ProviderModal({ settings, onSave, onClose }) {
  const [form, setForm] = reactExports.useState({ ...settings });
  const [models, setModels] = reactExports.useState([]);
  const [detecting, setDetecting] = reactExports.useState(false);
  const [detectError, setDetectError] = reactExports.useState("");
  const [modelMode, setModelMode] = reactExports.useState(
    () => settings.model && KNOWN_MODELS[settings.defaultProvider] ? KNOWN_MODELS[settings.defaultProvider].includes(settings.model) ? "preset" : "custom" : "preset"
  );
  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (key === "defaultProvider" && typeof val === "string") {
      setForm((prev) => ({ ...prev, defaultProvider: val, model: DEFAULT_MODELS[val] ?? "" }));
      setModelMode("preset");
      setModels([]);
      return;
    }
    setForm((prev) => ({ ...prev, [key]: val }));
    if (key === "model") setModels([]);
  };
  const detectModels = reactExports.useCallback(async () => {
    const url = serverUrl(form);
    if (!url) return;
    setDetecting(true);
    setDetectError("");
    setModels([]);
    try {
      const res = await fetch(`${url.replace(/\/+$/, "")}/models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const ids = (data.data ?? []).map((m) => m.id).filter(Boolean);
      if (ids.length === 0) throw new Error("Servidor rodando mas sem modelos. Carregue um modelo no LM Studio.");
      setModels(ids);
      if (ids.length === 1) setForm((prev) => ({ ...prev, model: ids[0] }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDetectError(msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network") ? `Servidor nao encontrado em ${url}. Verifique se esta rodando.` : msg);
    } finally {
      setDetecting(false);
    }
  }, [form]);
  const provider = PROVIDERS.find((p) => p.value === form.defaultProvider);
  const isLocal = provider?.local ?? false;
  const hint = HINTS[form.defaultProvider];
  const apiKeyCfg = API_KEY_CONFIG[form.defaultProvider];
  const knownModels = KNOWN_MODELS[form.defaultProvider];
  const canDetect = isLocal && !!serverUrl(form);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
      onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 560, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 32px)", overflow: "auto", background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--border)", padding: 24, display: "flex", flexDirection: "column", gap: 16 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { style: { fontSize: 15, fontWeight: 700 }, children: "Settings" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, "aria-label": "Close", style: { background: "transparent", color: "var(--text-3)", fontSize: 16, padding: "4px 8px" }, children: "x" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Intelligence Engine", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(156px, 1fr))", gap: 10, marginTop: 4 }, children: PROVIDERS.map((p) => {
          const isSelected = form.defaultProvider === p.value;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                setForm((prev) => ({ ...prev, defaultProvider: p.value, model: DEFAULT_MODELS[p.value] ?? "" }));
                setModelMode("preset");
                setModels([]);
              },
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 7,
                minHeight: 92,
                padding: 12,
                background: isSelected ? "var(--cyan-glow)" : "var(--bg-1)",
                border: `1px solid ${isSelected ? "var(--cyan)" : "var(--border)"}`,
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s, background 0.2s",
                position: "relative"
              },
              children: [
                isSelected && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { position: "absolute", top: 8, right: 8, color: "var(--cyan)", fontSize: 10, fontWeight: 800 }, children: "SELECTED" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 800, color: isSelected ? "var(--text-1)" : "var(--text-2)" }, children: p.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "var(--text-3)", lineHeight: 1.35 }, children: p.description }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: isSelected ? "var(--cyan)" : "var(--text-3)", fontWeight: 700 }, children: p.local ? "LOCAL" : "CLOUD" })
              ]
            },
            p.value
          );
        }) }) }),
        hint && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "10px 12px", background: "var(--teal-dim)", borderRadius: 6, fontSize: 12, color: "var(--teal)", lineHeight: 1.6 }, children: hint }),
        (form.defaultProvider === "lmstudio" || form.defaultProvider === "openai-compatible") && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "URL do servidor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.compatibleUrl, onChange: set("compatibleUrl"), placeholder: "http://localhost:1234/v1", style: FIELD }) }),
        form.defaultProvider === "ollama" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Ollama URL", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.ollamaUrl, onChange: set("ollamaUrl"), placeholder: "http://localhost:11434/v1", style: FIELD }) }),
        apiKeyCfg && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: apiKeyCfg.label, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            value: apiKeyCfg.key === "nvidiaKey" && form.hasNvidiaKey && !form.nvidiaKey ? form.nvidiaKeyPreview : String(form[apiKeyCfg.key] ?? ""),
            onChange: set(apiKeyCfg.key),
            placeholder: apiKeyCfg.placeholder,
            style: FIELD,
            autoComplete: "off"
          }
        ) }),
        form.defaultProvider === "nvidia" && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text-2)", fontSize: 13, paddingTop: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: form.nvidiaEnableThinking ?? true, onChange: (e) => setForm((prev) => ({ ...prev, nvidiaEnableThinking: e.target.checked })) }),
          "Habilitar modo reasoning"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: "Modelo", children: [
          isLocal ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            models.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.model, onChange: set("model"), style: { ...FIELD, flex: 1, cursor: "pointer" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Usar modelo carregado" }),
              models.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m }, m))
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.model, onChange: set("model"), placeholder: "Click Detect", style: { ...FIELD, flex: 1 } }),
            canDetect && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: detectModels,
                disabled: detecting,
                style: { background: "var(--bg-3)", color: detecting ? "var(--text-3)" : "var(--teal)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: 6, fontSize: 12, flexShrink: 0 },
                children: detecting ? "..." : "Detectar"
              }
            )
          ] }) : knownModels ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
            modelMode === "preset" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.model, onChange: set("model"), style: { ...FIELD, cursor: "pointer", borderColor: !form.model ? "var(--amber)" : void 0 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione o modelo" }),
              knownModels.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m }, m))
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: form.model,
                  onChange: set("model"),
                  placeholder: "Paste the exact API ID (for example: gemini-3.1-pro)",
                  style: { ...FIELD, borderColor: !form.model ? "var(--amber)" : void 0 },
                  autoFocus: true
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }, children: "Use o ID exato da API do provider, nao o nome de exibicao. Erros de nome causam erro 400." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 6 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => setModelMode(modelMode === "preset" ? "custom" : "preset"),
                style: { fontSize: 11, color: "var(--text-3)", background: "var(--bg-active)", padding: "3px 8px", borderRadius: 4 },
                children: modelMode === "preset" ? "+ Modelo personalizado / mais recente" : "Voltar para lista"
              }
            ) })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.model, onChange: set("model"), placeholder: "exact model name (required)", style: FIELD }),
          detectError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "var(--red)", marginTop: 4 }, children: detectError }),
          models.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 11, color: "var(--teal)", marginTop: 4 }, children: [
            models.length,
            " modelos detectados"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 20, alignItems: "flex-end", paddingTop: 12, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Max iterations", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "number",
              min: 1,
              max: 20,
              value: form.maxIterations,
              onChange: (e) => setForm((prev) => ({ ...prev, maxIterations: Number(e.target.value) })),
              style: { ...FIELD, width: 88 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Command permissions", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.permissionMode ?? "auto-review", onChange: set("permissionMode"), style: { ...FIELD, width: 180 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto-review", children: "Auto-review safe commands" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ask", children: "Ask before commands" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "full-access", children: "Full access" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text-2)", fontSize: 13, paddingBottom: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: form.autoApply, onChange: set("autoApply") }),
            "Auto-apply when score is 90+"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--border)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, style: { background: "var(--bg-active)", color: "var(--text-2)", padding: "8px 16px", borderRadius: 6 }, children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onSave(form), style: { background: "var(--cyan)", color: "#000", padding: "8px 16px", fontWeight: 700, borderRadius: 6 }, children: "Save" })
        ] })
      ] })
    }
  );
}
const TerminalPanel = React.lazy(() => __vitePreload(() => import("./TerminalPanel-DbZy1oCb.js"), true ? __vite__mapDeps([0,1]) : void 0, import.meta.url).then((m) => ({ default: m.TerminalPanel })));
const EMPTY_REASONING = {
  active: false,
  text: "",
  startedAt: null,
  endedAt: null
};
function localServerUrl(s) {
  if (s.defaultProvider === "ollama") return s.ollamaUrl;
  if (s.defaultProvider === "lmstudio" || s.defaultProvider === "openai-compatible") return s.compatibleUrl;
  return null;
}
const EMPTY_USAGE = {
  contextTokens: 0,
  completionTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
  contextFiles: [],
  selectedFiles: [],
  blockedFiles: [],
  rejectedFiles: [],
  contextWarnings: [],
  learningsCount: 0,
  maxContextTokens: null
};
function normalizeSessionUsage(usage) {
  return { ...EMPTY_USAGE, ...usage ?? {} };
}
function appendServerExitEvent(events, task, session, exitCode) {
  if (!task || !session || !looksLikeDevServerCommand(session.command)) return events;
  const lastMatchingEvent = [...events].reverse().find((event) => event.serverSession?.sessionId === session.id);
  if (lastMatchingEvent?.type === "server_failed") return events;
  return [
    ...events,
    {
      type: "server_failed",
      taskId: task.id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: `Dev server process exited with code ${exitCode}.`,
      toolInput: { command: session.command },
      serverSession: {
        sessionId: session.id,
        command: session.command,
        cwd: session.cwd,
        persistent: true,
        ready: false,
        diagnostics: [`process_exited:${exitCode}`]
      }
    }
  ];
}
function looksLikeDevServerCommand(command) {
  const normalized = command.trim().toLowerCase();
  return [
    /^npm(?:\.cmd)?\s+run\s+dev\b/,
    /^pnpm(?:\.cmd)?\s+(?:run\s+)?dev\b/,
    /^yarn(?:\.cmd)?\s+dev\b/,
    /^bun(?:\.cmd)?\s+dev\b/,
    /^(?:npx\s+)?vite(?:\s|$)/,
    /^(?:npx\s+)?next\s+dev\b/,
    /^(?:npx\s+)?astro\s+dev\b/,
    /^(?:npx\s+)?remix\s+dev\b/,
    /^webpack\s+serve\b/,
    /^python\s+manage\.py\s+runserver\b/,
    /^rails\s+(?:s|server)\b/
  ].some((pattern) => pattern.test(normalized));
}
function App() {
  const [state, setState] = reactExports.useState({
    projectRoot: null,
    task: null,
    executionState: null,
    settings: null,
    messages: [],
    executionEvents: [],
    streamingText: "",
    reasoning: EMPTY_REASONING,
    isThinking: false,
    showSettings: false,
    showDiff: false,
    activeModel: null,
    modelConnected: false,
    openFilePath: null,
    fileRefreshKey: 0,
    sessionId: null,
    sessionUsage: EMPTY_USAGE,
    queuedMessages: [],
    activeMode: "patch",
    terminalSessions: [],
    pendingApproval: null,
    todos: []
  });
  useEngineEvents(setState);
  reactExports.useEffect(() => {
    const unsubStart = window.kova.onTerminalStarted((id, command, cwd) => {
      setState((prev) => ({
        ...prev,
        terminalSessions: [...prev.terminalSessions.filter((s) => s.id !== id), { id, command, cwd }]
      }));
    });
    const unsubExit = window.kova.onTerminalExit((id, exitCode) => {
      setState((prev) => ({
        ...prev,
        terminalSessions: prev.terminalSessions.map((s) => s.id === id ? { ...s, exitCode } : s),
        executionEvents: appendServerExitEvent(prev.executionEvents, prev.task, prev.terminalSessions.find((s) => s.id === id), exitCode)
      }));
    });
    const unsubApproval = window.kova.onInteractiveRequest((id, command, reason) => {
      setState((prev) => ({ ...prev, pendingApproval: { id, command, reason } }));
    });
    return () => {
      unsubStart();
      unsubExit();
      unsubApproval();
    };
  }, []);
  reactExports.useEffect(() => {
    if (!state.projectRoot) return;
    window.kova.watchProject?.(state.projectRoot).catch(() => false);
    const unsub = window.kova.onFileTreeChanged?.(() => {
      setState((prev) => ({ ...prev, fileRefreshKey: prev.fileRefreshKey + 1 }));
    });
    return () => {
      unsub?.();
      window.kova.unwatchProject?.().catch(() => false);
    };
  }, [state.projectRoot]);
  reactExports.useEffect(() => {
    if (!state.settings) return;
    const url = localServerUrl(state.settings);
    if (!url) return;
    window.kova.detectModel(url).then((m) => setState((prev) => ({ ...prev, activeModel: m || null, modelConnected: !!m })));
  }, [state.settings?.defaultProvider, state.settings?.compatibleUrl, state.settings?.ollamaUrl]);
  useSessionPersistence({
    projectRoot: state.projectRoot,
    messages: state.messages,
    isThinking: state.isThinking,
    sessionId: state.sessionId,
    task: state.task,
    sessionUsage: state.sessionUsage,
    executionState: state.executionState,
    executionEvents: state.executionEvents,
    todos: state.todos,
    onSessionIdCreated: (id) => setState((prev) => ({ ...prev, sessionId: id }))
  });
  const buildTaskParams = reactExports.useCallback((cmd) => {
    const s = state.settings;
    const apiKeyMap = {
      anthropic: s.anthropicKey,
      openai: s.openaiKey,
      deepseek: s.deepseekKey,
      gemini: s.geminiKey,
      openrouter: s.openrouterKey,
      kimi: s.kimiKey,
      "openai-compatible": s.openaiCompatibleKey
    };
    return {
      objective: cmd.text,
      projectRoot: state.projectRoot,
      provider: s.defaultProvider,
      apiKey: apiKeyMap[s.defaultProvider] || void 0,
      baseUrl: s.defaultProvider === "ollama" ? s.ollamaUrl : s.defaultProvider === "lmstudio" || s.defaultProvider === "openai-compatible" ? s.compatibleUrl : void 0,
      model: state.activeModel || s.model || void 0,
      autoApply: s.autoApply,
      maxIterations: s.maxIterations,
      mode: cmd.mode,
      // ← from atomic command, never stale
      permissionMode: s.permissionMode ?? "auto-review",
      includeProjectContext: true,
      queuedCount: state.queuedMessages.length,
      openedFiles: state.openFilePath ? [state.openFilePath] : []
    };
  }, [state.settings, state.projectRoot, state.activeModel, state.queuedMessages.length, state.openFilePath]);
  const sendNow = reactExports.useCallback(async (cmd) => {
    if (!state.settings || !state.projectRoot) return;
    const taskOnly = cmd.mode === "review" || cmd.mode === "plan";
    const history = buildTokenBudgetedHistory(state.messages, { taskOnly });
    setState((prev) => ({
      ...prev,
      isThinking: true,
      executionState: null,
      task: null,
      executionEvents: [],
      showDiff: false,
      streamingText: "",
      reasoning: EMPTY_REASONING,
      todos: [],
      messages: [...prev.messages, {
        id: createChatMessageId("user"),
        role: "user",
        content: cmd.text,
        isTask: false,
        attachments: cmd.attachments
      }]
    }));
    await window.kova.sendMessage(cmd.text, history, buildTaskParams(cmd), cmd.attachments);
  }, [state.settings, state.projectRoot, state.messages, buildTaskParams]);
  const handleSend = reactExports.useCallback(async (rawText, modeOverride, attachments) => {
    if (!state.settings || !state.projectRoot) return;
    const cmd = parseUserInput(rawText, modeOverride ?? state.activeMode, attachments);
    const isBusy = state.isThinking || !!state.executionState && !["completed", "failed", "paused"].includes(state.executionState.status);
    if (isBusy) {
      const queued = {
        id: createChatMessageId("queue"),
        content: cmd.text,
        mode: cmd.mode,
        permissionMode: state.settings.permissionMode ?? "auto-review",
        includeProjectContext: true
      };
      setState((prev) => ({ ...prev, queuedMessages: [...prev.queuedMessages, queued] }));
      return;
    }
    await sendNow(cmd);
  }, [state.settings, state.projectRoot, state.isThinking, state.executionState, state.activeMode, sendNow]);
  reactExports.useEffect(() => {
    const isBusy = state.isThinking || !!state.executionState && !["completed", "failed", "paused"].includes(state.executionState.status);
    if (isBusy || state.queuedMessages.length === 0 || !state.settings || !state.projectRoot) return;
    const [next, ...rest] = state.queuedMessages;
    setState((prev) => ({ ...prev, queuedMessages: rest }));
    void sendNow({ text: next.content, mode: next.mode, fromSlashCommand: false });
  }, [state.isThinking, state.executionState?.status, state.queuedMessages, state.settings, state.projectRoot, sendNow]);
  const handleOpenFolder = reactExports.useCallback(async () => {
    const folder = await window.kova.openFolder();
    if (folder) setState((prev) => ({
      ...prev,
      projectRoot: folder,
      openFilePath: null,
      executionEvents: [],
      executionState: null,
      task: null,
      isThinking: false,
      streamingText: "",
      reasoning: EMPTY_REASONING,
      showDiff: false,
      messages: [],
      sessionId: null,
      sessionUsage: EMPTY_USAGE,
      queuedMessages: [],
      todos: []
    }));
  }, []);
  const handleLoadSession = reactExports.useCallback((session) => {
    setState((prev) => ({
      ...prev,
      sessionId: session.id,
      messages: session.messages || [],
      task: session.task || null,
      executionState: session.executionState || null,
      executionEvents: session.events || [],
      isThinking: false,
      streamingText: "",
      reasoning: EMPTY_REASONING,
      showDiff: false,
      openFilePath: null,
      sessionUsage: normalizeSessionUsage(session.sessionUsage),
      todos: session.todos || []
    }));
  }, []);
  const handleSaveSettings = reactExports.useCallback(async (settings) => {
    await window.kova.saveSettings(settings);
    const isLocal = ["ollama", "lmstudio", "openai-compatible"].includes(settings.defaultProvider);
    setState((prev) => ({
      ...prev,
      settings,
      showSettings: false,
      // For cloud providers: show the configured model immediately in the TitleBar
      activeModel: settings.model || (isLocal ? prev.activeModel : null),
      modelConnected: !!settings.model || isLocal && prev.modelConnected
    }));
  }, []);
  const handleSelectModel = reactExports.useCallback((model) => {
    setState((prev) => ({ ...prev, activeModel: model, modelConnected: true }));
    if (state.settings) {
      const updated = { ...state.settings, model };
      window.kova.saveSettings(updated);
      setState((prev) => ({ ...prev, settings: updated }));
    }
  }, [state.settings]);
  const handleOpenFile = reactExports.useCallback((path) => {
    setState((prev) => ({ ...prev, openFilePath: path }));
  }, []);
  const changedPaths = reactExports.useMemo(() => {
    const paths = /* @__PURE__ */ new Set();
    state.executionState?.iterationHistory?.forEach((iter) => iter.changes.forEach((c) => paths.add(c.path)));
    state.executionEvents.forEach((e) => {
      if (e.type === "tool_call" && (e.toolName === "write_file" || e.toolName === "delete_file")) {
        const p = e.toolInput?.path;
        if (p) paths.add(p);
      }
      if (e.type === "file_mutation") {
        e.changes?.forEach((c) => paths.add(c.path));
      }
    });
    return paths;
  }, [state.executionState, state.executionEvents]);
  const lastIteration = state.executionState?.iterationHistory?.at(-1) ?? null;
  const hasChanges = (lastIteration?.changes?.length ?? 0) > 0;
  const isRunning = !!state.executionState && !["completed", "failed", "paused"].includes(state.executionState.status);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-1)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TitleBar,
      {
        projectRoot: state.projectRoot,
        status: state.executionState?.status ?? null,
        settings: state.settings,
        activeModel: state.activeModel,
        modelConnected: state.modelConnected,
        onOpenFolder: handleOpenFolder,
        onOpenSettings: () => setState((prev) => ({ ...prev, showSettings: true })),
        onSelectModel: handleSelectModel
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flex: 1, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Sidebar,
        {
          executionState: state.executionState,
          projectRoot: state.projectRoot,
          sessionUsage: state.sessionUsage,
          changedPaths,
          refreshKey: state.fileRefreshKey,
          onOpenFile: handleOpenFile,
          onLoadSession: handleLoadSession
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [
        state.openFilePath ? /* @__PURE__ */ jsxRuntimeExports.jsx(FileEditor, { path: state.openFilePath, onClose: () => setState((prev) => ({ ...prev, openFilePath: null })) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChatArea,
          {
            messages: state.messages,
            executionState: state.executionState,
            task: state.task,
            isThinking: state.isThinking,
            isRunning,
            streamingText: state.streamingText,
            reasoning: state.reasoning,
            events: state.executionEvents,
            projectRoot: state.projectRoot,
            onSend: handleSend,
            onOpenFolder: handleOpenFolder,
            queuedMessages: state.queuedMessages,
            activeMode: state.activeMode,
            sessionUsage: state.sessionUsage,
            activeModel: state.activeModel,
            supportsVision: state.activeModel ? detectVisionSupport(state.activeModel) : void 0,
            todos: state.todos,
            onModeChange: (activeMode) => setState((prev) => ({ ...prev, activeMode })),
            onClearQueue: () => setState((prev) => ({ ...prev, queuedMessages: [] }))
          }
        ),
        hasChanges && state.showDiff && !state.openFilePath && /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilesViewer,
          {
            changes: lastIteration.changes,
            onClose: () => setState((prev) => ({ ...prev, showDiff: false })),
            onApplySelection: (selection) => window.kova.forceApply(selection)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        HarnessDashboard,
        {
          executionState: state.executionState,
          events: state.executionEvents,
          sessionUsage: state.sessionUsage,
          isThinking: state.isThinking,
          onViewDiff: hasChanges ? () => setState((prev) => ({ ...prev, showDiff: !prev.showDiff })) : void 0,
          onPause: () => window.kova.pause(),
          onAbort: () => {
            window.kova.abort();
            setState((prev) => ({ ...prev, executionState: null, isThinking: false, executionEvents: [], streamingText: "", reasoning: EMPTY_REASONING, todos: [] }));
          },
          onApply: () => window.kova.forceApply(),
          onRepair: () => {
            void handleSend("Validation failed. Investigate the cause, make the smallest possible fix, and run validation again. Do not change the architecture.");
          }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(React.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      TerminalPanel,
      {
        sessions: state.terminalSessions,
        pendingApproval: state.pendingApproval,
        onClose: (id) => setState((prev) => ({ ...prev, terminalSessions: prev.terminalSessions.filter((s) => s.id !== id) })),
        onApprove: (id, approved) => {
          setState((prev) => ({ ...prev, pendingApproval: null }));
          window.kova.terminalApprove(id, approved);
        }
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBar, { executionState: state.executionState, sessionUsage: state.sessionUsage, events: state.executionEvents }),
    state.showSettings && state.settings && /* @__PURE__ */ jsxRuntimeExports.jsx(ProviderModal, { settings: state.settings, onSave: handleSaveSettings, onClose: () => setState((prev) => ({ ...prev, showSettings: false })) })
  ] });
}
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(e) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 32, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--bg-1)", height: "100vh" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Erro ao renderizar:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { style: { marginTop: 12, whiteSpace: "pre-wrap" }, children: this.state.error })
    ] });
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
export {
  jsxRuntimeExports as j,
  reactExports as r
};
