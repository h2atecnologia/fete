var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//MIT License Copyright (c) 2017 AnyWhichWay, LLC and Simon Y. Blackwell
(function () {
	function evalInContext(js, context) {
		//# Return the results of the in-line anonymous function we .call with the passed context
		return function () {
			return eval(js);
		}.call(context);
	}
	var Fete = void 0;
	(function () {
		"use strict";

		function deepFreeze(object) {
			!object || (typeof Object === "undefined" ? "undefined" : _typeof(Object)) !== object || Object.getOwnPropertyNames(object).forEach(function (key) {
				var value = obj[key];
				if (value && (typeof value === "undefined" ? "undefined" : _typeof(value)) === 'object') deepFreeze(value);
			});
			return Object.freeze(object);
		}
		function tag(literals) {
			var div = document.createElement("interpolation");
			literals = literals.raw;

			for (var _len = arguments.length, substitutions = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				substitutions[_key - 1] = arguments[_key];
			}

			for (var i = 0; i < literals.length - 1; i++) {
				var _literal = literals[i];
				while (_literal.indexOf("  ") == 0) {
					_literal = _literal.substring(1);
				}_literal.length === 0 || div.appendChild(document.createTextNode(literals[i]));
				var items = substitutions[i];
				Array.isArray(items) || (items = [items]);
				for (var _i = 0; _i < items.length; _i++) {
					var item = items[_i],
					    substitution = item instanceof Node ? item : document.createTextNode(item !== undefined && item !== null ? (_i > 0 ? "," : "") + item : "");
					div.appendChild(substitution);
				}
			}
			var literal = literals[i].trimRight();
			while (literal.indexOf("  ") == 0) {
				literal = literal.substring(1);
			}literal.length === 0 || div.appendChild(document.createTextNode(literals[i]));
			return div;
		}
		function getContent(view) {
			return (typeof view === "undefined" ? "undefined" : _typeof(view)) === "object" && view ? view instanceof HTMLInputElement ? view.value : view instanceof HTMLElement ? view.innerHTML : view instanceof Node ? view.textContent : view : view;
		}
		function createInterpolator(template, imports) {
			if (!template || !template.valueOf() || template.valueOf().indexOf("${") === -1) return;
			var body = "(function (interp,tag,imprt) {\n\t\t\tconst $ = imprt, $include = imprt.include;\n\t\t\tlet values; \n\t\t\twith(this) { \n\t\t\t\ttry { values = tag__template__; }\n\t\t\t\tcatch(e) { \n\t\t\t\t\tif(e instanceof ReferenceError) {\n\t\t\t\t\t\tconst key = e.message.trim().replace(/'/g,'').split(' ')[0],\n\t\t\t\t\t\tvalue = this[key];\n\t\t\t\t\t\tthis[key] = (typeof(value)!=='undefined' ? value : '');\n\t\t\t\t\t\treturn interp.call(this,interp,tag,imprt);\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t} \n\t\t\treturn values;\n\t\t})".replace(/__template__/g, "`" + template + "`"),
			    interpolator = evalInContext(body, {});
			return function () {
				return interpolator.call(this, interpolator, tag, imports);
			};
		}
		var bindings = new Map(),
		    interpolators = new Map(),
		    targets = new Map(),
		    parents = new Map();

		var F = function () {
			function F() {
				var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { activate: true, reactive: true };

				_classCallCheck(this, F);

				var fete = this;
				this.imports = Object.assign({}, options.imports || {});
				this.imports.include = function (view, scope) {
					view instanceof HTMLElement || (view = document.querySelector(view));
					if (view instanceof HTMLTemplateElement) {
						var replacement = document.createElement("include");
						replacement.innerHTML = view.innerHTML.replace(/\s\s+/g, ' ');
						return fete.compile(replacement).use(scope, options.activate, options.reactive);
					}
					return fete.compile(view.cloneNode(true)).use(scope, options.activate, options.reactive);
				};
				this.imports.element = function (tagName, data) {
					var element = document.createElement(tagName),
					    contents = Array.isArray(data) ? data : [data];
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = contents[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var item = _step.value;

							if (item instanceof Node) {
								element.appendChild(item);
							} else {
								element.appendChild(document.createTextNode(typeof item === "string" ? item : JSON.stringify(item)));
							}
						}
					} catch (err) {
						_didIteratorError = true;
						_iteratorError = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion && _iterator.return) {
								_iterator.return();
							}
						} finally {
							if (_didIteratorError) {
								throw _iteratorError;
							}
						}
					}

					return element;
				};
				Node.prototype.use = function (data, activate, reactive) {
					var me = this;
					!activate || (data = fete.activate(data));
					if (me instanceof HTMLElement) {
						var children = [];
						for (var i = 0; i < me.childNodes.length; i++) {
							children.push(me.childNodes[i]);
						}var _iteratorNormalCompletion2 = true;
						var _didIteratorError2 = false;
						var _iteratorError2 = undefined;

						try {
							for (var _iterator2 = children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
								var child = _step2.value;
								child.use(data, activate, reactive);
							}
						} catch (err) {
							_didIteratorError2 = true;
							_iteratorError2 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion2 && _iterator2.return) {
									_iterator2.return();
								}
							} finally {
								if (_didIteratorError2) {
									throw _iteratorError2;
								}
							}
						}

						for (var _i2 = 0; _i2 < me.attributes.length; _i2++) {
							var attribute = me.attributes[_i2];
							if (attribute.value.indexOf("${") === 0 && (me.getAttribute("data-two-way") === "true" || reactive)) {
								me.property = attribute.value.substring(2, attribute.value.lastIndexOf("}")).trim();
								if (data && (typeof data === "undefined" ? "undefined" : _typeof(data)) === "object") {
									data[me.property] !== undefined || (data[me.property] = null);
									bindings.set(me, { object: data, property: me.property });
								}
							}
							attribute.use(data, activate, reactive);
						}
					} else {
						var current = fete.cView,
						    target = targets.get(me),
						    views = target ? target.__views__ : undefined;
						fete.cView = me;
						!activate || (data = fete.activate(data));
						if (target && views) views.forEach(function (oldview) {
							oldview !== me || views.delete(oldview);
						});
						var interpolator = interpolators.get(me.id);
						if (interpolator) {
							var node = interpolator.call(data);
							if (me instanceof Attr && node) me.value = node.childNodes[0].wholeText;else if (node) {
								parents.set(me.id, me.parentNode);
								node.id = me.id;
								me.parentNode.replaceChild(node, me);
							}
						}
						fete.cView = current;
					}
					targets.set(me, data);
					return me;
				};
				Object.defineProperty(Node.prototype, "model", { get: function get() {
						return targets.get(this);
					}, set: function set(value) {
						this.use(value, options.activate, options.reactive);return true;
					}
				});

				Object.defineProperty(fete, "routeHandler", { writable: true, configurable: true, value: function value(e) {
						if (e.target.tagName === "A" && e.target.host === window.location.host && e.target.hash) fete.router(e, function (allow) {
							if (!allow) {
								e.preventDefault();
							}
						});
					} });
				Object.defineProperty(fete, "popHandler", { writable: true, configurable: true, value: function value(event) {
						if (!event.state) return;
						var parser = document.createElement("a"),
						    view = document.getElementById(event.state.view);
						event.retarget = view;
						parser.href = event.state.href;
						var _arr = ["href", "origin", "host", "protocol", "hostname", "pathname", "hash", "search"];
						for (var _i3 = 0; _i3 < _arr.length; _i3++) {
							var key = _arr[_i3];event.target[key] = parser[key];
						}fete.router(event);
					} });

				function onchange(event) {
					fete.cView = event.target;
					var lazy = event.target.getAttribute("lazy");
					if (["keyup", "paste", "cut"].includes(event.type) && (lazy == true || lazy === "")) return;
					var value = event.target.type === "select-multiple" ? [] : event.target.type === "checkbox" ? event.target.value = event.target.checked : event.target.value,
					    binding = bindings.get(event.target);
					if (event.target.type === "select-multiple") {
						for (var i = 0; event.target[i]; i++) {
							if (event.target[i].selected) value.push(event.target[i].value);
						}
					}
					!binding || binding.object[binding.property] === event.target.value || (binding.object[binding.property] = value);
					fete.router(event);
				}
				document.addEventListener("change", onchange);
				var _arr2 = ["keyup", "paste", "cut"];
				for (var _i4 = 0; _i4 < _arr2.length; _i4++) {
					var type = _arr2[_i4];document.addEventListener(type, onchange);
				}
			}

			_createClass(F, [{
				key: "router",
				value: function router(event, next) {
					var target = event.currentTarget,
					    //event.retarget || event.target,
					controller = target.controller;
					if (controller) {
						var controllertype = typeof controller === "undefined" ? "undefined" : _typeof(controller),
						    model = target.model ? JSON.parse(JSON.stringify(target.model)) : {};
						deepFreeze(model);
						if (controllertype === "function") controller(event, target.model, target.property, target.value);else if (controllertype === "object") {
							Object.keys(controller).every(function (key) {
								var state = void 0,
								    test = controller[key].test,
								    rslt = false;;
								if (event.target.hash) state = event.target.hash.substring(1);else if (typeof test === "function") rslt = test(event, model);
								if (rslt || state && new RegExp(key).test(state)) {
									event.type === "popstate" || rslt || history.pushState({ href: target.href, view: target.id }, controller[key].title || state);
									var view = controller[key].selector ? document.querySelector(controller[key].selector) : target;
									if (typeof controller[key].sideffect === "function") controller[key].sideffect(event, view, model);
									return controller[key].cascade;
								}
								return true;
							});
						}
						event.preventDefault();
						event.stopPropagation();
					}
					!next || next();
				}
			}, {
				key: "activate",
				value: function activate(model) {
					if (!model || (typeof model === "undefined" ? "undefined" : _typeof(model)) !== "object" || model.__views__) return model;
					var me = this,
					    views = new Map(),
					    proxy = new Proxy(model, {
						get: function get(target, property) {
							if (property === "__views__") return views;
							if (typeof target[property] !== "function" && property !== Symbol.unscopables && me.cView) {
								var reactive = views.get(property);
								reactive || (reactive = new Set());
								reactive.add(me.cView);
								views.set(property, reactive);
							}
							return target[property];
						},
						set: function set(target, property, value) {
							//if(target[property]===value) return true;
							target[property] = value;
							if (typeof target[property] !== "function" && property !== Symbol.unscopables) {
								var focused = document.activeElement,
								    reactive = views.get(property);
								!reactive || reactive.forEach(function (view) {
									var current = me.cView;
									me.cView = view;
									var interpolator = interpolators.get(view.id);
									if (interpolator) {
										var node = interpolator.call(proxy);
										if (view instanceof Attr && node) {
											view.value = node.childNodes[0].wholeText;
											view.property = property;
										} else if (node) {
											var parent = view.parentNode ? view.parentNode : parents.get(view.id);
											node.id = view.id;
											for (var i = 0; i < parent.childNodes.length; i++) {
												var child = parent.childNodes[i];
												if (child.id === view.id) {
													parent.insertBefore(node, child);parent.removeChild(child);break;
												}
											}
										}
									}
									me.cView = current;
								});
								if (focused) {
									var tofocus = document.getElementById(focused.id);
									if (tofocus) {
										tofocus.focus();
										tofocus.selectionStart = tofocus.selectionEnd = tofocus.value.length;
									}
								}
							}
							return true;
						}
					});
					Object.keys(model).forEach(function (key) {
						var value = model[key];
						if (value && (typeof value === "undefined" ? "undefined" : _typeof(value)) === "object") model[key] = me.activate(value, proxy);
					});
					return proxy;
				}
			}, {
				key: "bind",
				value: function bind(model, view, controller) {
					var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { reactive: true };

					model = this.activate(model);
					view instanceof HTMLElement || (view = document.querySelector(view));
					if (!view) {
						throw new Error("Fete.bind: 'view' undefined");
					}
					var template = options.template;
					if (template) {
						template instanceof HTMLElement || (template = document.querySelector(template));
						if (!template) {
							throw new Error("Fete.bind: 'options.template' not found " + options.template);
						}
						view.innerHTML = template.innerHTML;
					}
					this.compile(view);
					if (model) view.use(model, true, options.reactive);
					view.controller = controller;
					view.addEventListener("click", this.routeHandler, false);
					return model;
				}
			}, {
				key: "compile",
				value: function compile(view) {
					var me = this,
					    fete = this,
					    current = fete.cView;
					if (interpolators.get(view.id)) return view;
					fete.cView = me;
					if (view instanceof HTMLElement) {
						var children = [];
						for (var i = 0; i < view.childNodes.length; i++) {
							children.push(view.childNodes[i]);
						}var _iteratorNormalCompletion3 = true;
						var _didIteratorError3 = false;
						var _iteratorError3 = undefined;

						try {
							for (var _iterator3 = children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
								var child = _step3.value;
								me.compile(child);
							}
						} catch (err) {
							_didIteratorError3 = true;
							_iteratorError3 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion3 && _iterator3.return) {
									_iterator3.return();
								}
							} finally {
								if (_didIteratorError3) {
									throw _iteratorError3;
								}
							}
						}

						for (var _i5 = 0; _i5 < view.attributes.length; _i5++) {
							me.compile(view.attributes[_i5]);
						}
					} else if (["string", "number", "boolean"].includes(typeof view === "undefined" ? "undefined" : _typeof(view))) {
						var replacement = {};
						replacement.id = (Math.random() + "").substring(2);
						var interpolator = createInterpolator(getContent(view), me.imports);
						Object.defineProperty(replacement, "use", { value: function value(data, activate) {
								var me = this,
								    current = fete.cView;
								fete.cView = me;
								!activate || (data = fete.activate(data));
								var target = targets.get(me);
								if (target && target.__views__) target.__views__.forEach(function (oldview) {
									oldview !== me || target.__views__.delete(oldview);
								});
								targets.set(me, data);
								fete.cView = current;
								return me;
							} });
						Object.defineProperty(replacement, "model", { get: function get() {
								return targets.get(this);
							}, set: function set(value) {
								this.use(value, options.activate);return true;
							}
						});
						Object.defineProperty(replacement, "valueOf", { value: function value() {
								var _this = this;

								return interpolator ? function () {
									var value = interpolator.call(targets.get(_this));return value ? value.innerHTML : undefined;
								}() : targets.get(this);
							} });
						view = replacement;
					}
					if (!(view instanceof HTMLElement)) {
						var _interpolator = createInterpolator(getContent(view), me.imports);
						if (_interpolator) {
							view.id || (view.id = (Math.random() + "").substring(2));
							interpolators.set(view.id, _interpolator);
						}
					}
					fete.cView = current;
					return view;
				}
			}]);

			return F;
		}();

		Fete = F;
	})();
	if (typeof module !== "undefined") {
		module.export = Fete;
	} else if (typeof this !== "undefined") {
		this.Fete = Fete;
	} else {
		window.Fete = Fete;
	}
}).call(undefined);