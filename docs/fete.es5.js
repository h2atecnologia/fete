"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
	'use strict';

	var genId = function genId() {
		return (Math.random() + "").substring(2);
	},
	    restoreEntities = function restoreEntities(html) {
		return html.replace(/&gt;/g, ">").replace(/&lt;/g, "<");
	},
	    toBoolean = function toBoolean(value) {
		var lookup = {
			true: true,
			false: false,
			yes: true,
			no: false,
			"1": true,
			"0": false,
			y: true,
			n: false
		};
		return lookup[value];
	},
	    parser = "function(tag,$={},model={}) {\n\t\tfunction parse() {\n\t\t\twith(model) {\n\t\t\t\ttry { return tag__source__; }\n\t\t\t\tcatch(e) { \n\t\t\t\t\tif(e instanceof ReferenceError) {\n\t\t\t\t\t\tvar key = e.message.trim().replace(/'/g,'').split(' ')[0];\n\t\t\t\t\t\tmodel[key] = (typeof(value)!=='undefined' ? value : '');\n\t\t\t\t\t\treturn parse();\n\t\t\t\t\t} else throw(e);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\treturn parse();\n\t}",
	    _activate = function _activate(object) {
		if ((typeof object === "undefined" ? "undefined" : _typeof(object)) !== "object" || !object || object.__views__) return object;
		if (Array.isArray(object)) object.forEach(function (item, i) {
			return object[i] = _activate(item);
		});else Object.keys(object).forEach(function (key) {
			object[key] = _activate(object[key]);
		});
		var viewmap = new Map(),
		    proxy = new Proxy(object, {
			get: function get(target, property) {
				if (property === "__views__") return viewmap;
				var value = target[property],
				    type = typeof value === "undefined" ? "undefined" : _typeof(value);
				if (type !== "function") {
					var views = viewmap.get(property);
					if (!views) {
						views = new Set();
						viewmap.set(property, views);
					}
					views.add(viewStack.current);
				}
				return value;
			},
			set: function set(target, property, value) {
				target[property] = _activate(value);
				var views = viewmap.get(property),
				    sviews = [];
				!views || views.forEach(function (view) {
					return sviews.push(view);
				});
				sviews.forEach(function (view) {
					var replaced = false;
					if (view && view.replacement) {
						view = view.replacement;
						replaced = true;
					}
					if (view && (view.parentElement || view.ownerElement)) {
						replaced || view.use(proxy);
						view.render();
					} else if (!(view instanceof Attr)) views.delete(view); // garbage collect
				});
				return true;
			}
		});
		return proxy;
	},
	    router = function router(event, next) {
		var target = event.currentTarget,
		    controller = target.controller;
		if (controller) {
			var controllertype = typeof controller === "undefined" ? "undefined" : _typeof(controller),
			    model = target.model || {};
			if (controllertype === "function") controller(event, target.model, target.property, target.normalizedValue);else if (controllertype === "object") {
				Object.keys(controller).every(function (key) {
					var state = void 0,
					    rslt = false;
					var test = controller[key].test,
					    view = controller[key].selector ? document.querySelector(controller[key].selector) : target;
					if (event.target.hash) state = event.target.hash.substring(1);else if (typeof test === "function") rslt = test(event, view, model, state);
					if (rslt || state && new RegExp(key).test(state)) {
						event.type === "popstate" || rslt || history.pushState({ href: target.href, view: target.id }, controller[key].title || state);
						if (typeof controller[key].sideffect === "function") controller[key].sideffect(event, view, model);
						return controller[key].cascade;
					}
					return true;
				});
			}
		}
		!next || next();
	},
	    onchange = function onchange(event) {
		var lazy = event.target.getAttribute("lazy"),
		    focused = document.activeElement;
		if (["keyup", "paste", "cut"].includes(event.type) && (lazy == true || lazy === "") && event.target === focused && ![9, 13, 14].includes(event.keyCode)) return;
		var target = event.target,
		    model = target.model,
		    property = target.property;
		var value = void 0;
		if (model && property) {
			if (target.type === "radio") {
				if (target.checked && model[property] != target.value) value = target.value;
			} else {
				value = target.type === "select-multiple" ? [] : "checkbox" === target.type ? target.value = target.checked : target.value;
				if (target.type === "select-multiple") for (var i = 0; target[i]; i++) {
					if (target[i].selected) value.push(target[i].value);
				}
			}
			if (["", true, "true"].includes(target.getAttribute("data-two-way")) || fete.options.reactive) {
				model[property] = value;
			}
			target.normalizedValue = value;
		}
		if (target.controller) {
			event.preventDefault();
			event.stopPropagation();
		}
		if (focused) {
			focused.focus();
			typeof focused.selectionStart !== "number" || (focused.selectionStart = focused.selectionEnd = focused.value.length);
		}
		router(event);
	};
	document.addEventListener("change", onchange);
	var _arr = ["keyup", "paste", "cut"];
	for (var _i = 0; _i < _arr.length; _i++) {
		var type = _arr[_i];document.addEventListener(type, onchange);
	}function templateCompositeText() {
		var result = [arguments[0][0]];
		for (var i = 1; i < arguments.length; i++) {
			if (typeof arguments[i] !== "undefined") {
				if (Array.isArray(arguments[i])) result.push(arguments[i].join(","));else result.push(arguments[i]);
			}
			result.push(arguments[0][i]);
		}
		return result.join("");
	}

	function templateCompositeObjects() {
		var result = [arguments[0][0]];
		for (var i = 1; i < arguments.length; i++) {
			result.push(arguments[i]);
			result.push(arguments[0][i]);
		}
		return result;
	}

	function templateComposite() {
		var result = !(arguments[0][0] instanceof Node) ? arguments[0][0] !== "" ? [document.createTextNode(arguments[0][0])] : [] : [arguments[0][0]];
		for (var i = 1; i < arguments.length; i++) {
			if (typeof arguments[i] !== "undefined") {
				if (Array.isArray(arguments[i]) && arguments[i][0] instanceof Node) result = result.concat(arguments[i]);else result.push(arguments[i] instanceof Node ? arguments[i] : document.createTextNode(arguments[i]));
			}
			arguments[0][i] === "" || result.push(!(arguments[0][i] instanceof Node) ? document.createTextNode(arguments[0][i]) : arguments[0][i]);
		}
		return result;
	}

	function include(selector, model) {
		var current = viewStack.current,
		    view = document.createElement("include"),
		    template = document.querySelector(selector);
		view.innerHTML = template.innerHTML;
		model || (model = current.model);
		view.use(model);
		return view.compile().render();
	}

	function element(tagName) {
		var attributes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		var model = arguments[2];

		var current = viewStack.current,
		    view = document.createElement(tagName);
		for (var key in attributes) {
			view[key] = attributes[key];
		}model || (model = current.model);
		view.compile();
		return function (modelOrView) {
			if (modelOrView instanceof Node) view.appendChild(modelOrview);else if (Array.isArray(modelOrView)) {
				modelOrView.forEach(function (child) {
					child instanceof Node || (child = document.createTextNode(child));
					view.appendChild(child);
				});
			} else view.innerText = modelOrView;
			view.use(model);
			return view.render();
		};
	}

	var imports = {
		include: include,
		element: element
	},
	    viewStack = [];
	Object.defineProperty(viewStack, "current", { set: function set() {}, get: function get() {
			return viewStack[viewStack.length - 1];
		} });

	var Fete = function () {
		function Fete() {
			var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { reactive: true };

			_classCallCheck(this, Fete);

			var fete = this;
			fete.options = Object.assign({}, options);

			Object.defineProperty(Node.prototype, "model", { configurable: true, get: function get() {
					var model = this.__model__;
					if (!model && this.parentNode) return this.parentNode.model;
					return model;
				},
				set: function set(model) {
					this.__model__ = model;
					return true;
				}
			});
			Node.prototype.use = function (object, controller) {
				var model = _activate(object);
				this.model = model;
				this.controller = controller;
				return model;
			};

			Attr.prototype.compile = function () {
				var start = this.value.indexOf("${");
				if (start >= 0) {
					var interpolator = Function("return " + parser.replace("__source__", "`" + this.value.trim() + "`"))(),
					    owner = this.ownerElement;
					if ((this.name === "value" || owner.type === "radio") && start === 0) {
						var end = this.value.indexOf("}");
						if (end >= 3) {
							var property = this.value.substring(2, end);
							if (property.indexOf(" ") === -1) owner.property = property; // should use a RegExp
						}
					}
					this.interpolator = function (model) {
						!owner.property || !!model[owner.property] || !Object.getOwnPropertyDescriptor(window, owner.property) || Object.defineProperty(model, owner.property, { configurable: true, writable: true, enumerable: true, value: undefined });
						return interpolator(templateCompositeObjects, imports, model);
					};
					if (["foreach", "if"].includes(this.name)) {
						this.displayMode = owner.style.display;
						this.innerInterpolator = Function("return " + parser.replace("__source__", "`" + restoreEntities(owner.innerHTML) + "`"))();
					}
				}
				return this;
			};
			Attr.prototype.render = function () {
				var _this = this;

				var model = this.model || {};
				if (this.interpolator) {
					viewStack.push(this);
					var owner = this.ownerElement;
					var value = this.interpolator(model);
					if (this.name === "if" && !owner.getAttribute("foreach")) {
						while (owner.childNodes.length) {
							owner.removeChild(owner.childNodes[0]);
						}if (!value || !value[1]) {
							owner.style.display = "none";
							return;
						} else {
							owner.style.display = this.displayMode;
							var imported = Object.assign({}, imports);
							imported.this = model;
							var html = this.innerInterpolator(templateCompositeText, imported, model),
							    span = document.createElement("span");
							span.innerHTML = html;
							while (span.childNodes.length > 0) {
								owner.appendChild(span.childNodes[0]);
							}
						}
					} else if (this.name === "foreach") {
						while (owner.childNodes.length) {
							owner.removeChild(owner.childNodes[0]);
						}if (!value) return;
						if (owner.getAttribute("if")) {
							for (var i = 0; i < owner.attributes.length; i++) {
								var attribute = owner.attributes[i];
								if (attribute.name === "if") {
									var _value = attribute.interpolator(model);
									if (!_value || !_value[1]) {
										owner.style.display = "none";
										return;
									} else {
										owner.style.display = this.displayMode;
									}
								}
							}
						}
						value = value[1]; // 0 will = ""
						var _imported = Object.assign({}, imports);
						_imported.this = value;
						if (Array.isArray(value)) {
							value.forEach(function (item, i) {
								_imported.key = i;
								var html = _this.innerInterpolator(templateCompositeText, _imported, item),
								    span = document.createElement("span");
								span.innerHTML = html;
								while (span.childNodes.length > 0) {
									owner.appendChild(span.childNodes[0]);
								}
							});
						} else {
							Object.keys(value).forEach(function (key) {
								_imported.key = key;
								var html = _this.innerInterpolator(templateCompositeText, _imported, value[key]),
								    span = document.createElement("span");
								span.innerHTML = html;
								while (span.childNodes.length > 0) {
									owner.appendChild(span.childNodes[0]);
								}
							});
						}
					} else {
						value = value.filter(function (item) {
							return typeof item !== "undefined";
						}).map(function (item) {
							return Array.isArray(item) ? item.join(",") : item;
						}).join("");
						if (this.name === "checked" && owner.type === "radio") {
							if (owner.value == value) owner.checked || (owner.checked = true);
						} else if (owner.type === "checkbox" && this.name === "value") {
							if (owner.value != value) {
								owner.value = value;
								owner.checked = toBoolean(value);
							}
						} else if (owner.type && owner.type.indexOf("select") === 0 && this.name === "value") {
							var values = Array.isArray(value) ? value : value.split(",");
							for (var _i2 = 0; values.length > 0 && owner[_i2]; _i2++) {
								if (values.includes(owner[_i2].value)) owner[_i2].selected || (owner[_i2].selected = true);else owner[_i2].selected = false;
							}
						} else {
							owner[this.name] == value || (owner[this.name] = value);
						}
					}
					viewStack.pop();
				}
				return this;
			};
			Object.defineProperty(Attr.prototype, "model", { configurable: true, get: function get() {
					var model = this.__model__;
					return model || this.ownerElement.model;
				},
				set: function set(model) {
					this.__model__ = model;
					return true;
				}
			});

			Text.prototype.compile = function () {
				if (this.textContent.indexOf("${") >= 0) {
					var interpolator = new Function("return " + parser.replace("__source__", "`" + this.textContent + "`"))();
					this.interpolator = function (model) {
						return interpolator(templateComposite, imports, model);
					};
				}
				return this;
			};
			Text.prototype.render = function () {
				var model = this.model || {};
				if (this.interpolator) {
					viewStack.push(this);
					var content = this.interpolator(model),
					    parent = this.parentElement,
					    removals = [];
					for (var i = 0; i < parent.childNodes.length; i++) {
						var child = parent.childNodes[i];
						if (child.interpolator === this.interpolator) removals.push(child);
					}
					this.replacement = null;
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = content[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var node = _step.value;

							if (!this.replacement) {
								this.replacement = node;
								node.render = this.render;
								node.use(model);
							}
							node.interpolator = this.interpolator; // used as a identifier for removal
							parent.insertBefore(node, this);
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

					var _iteratorNormalCompletion2 = true;
					var _didIteratorError2 = false;
					var _iteratorError2 = undefined;

					try {
						for (var _iterator2 = removals[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
							var removal = _step2.value;
							parent.removeChild(removal);
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

					viewStack.pop();
				}
				return this;
			};

			HTMLElement.prototype.compile = function (twoway) {
				for (var i = 0; i < this.attributes.length; i++) {
					var attribute = this.attributes[i];
					attribute.compile();
				}
				for (var _i3 = 0; _i3 < this.childNodes.length; _i3++) {
					var child = this.childNodes[_i3];
					if (child instanceof HTMLInputElement && twoway) {
						child.setAttribute("data-two-way", true);
					}
					child.compile(twoway);
				}
				return this;
			};
			HTMLElement.prototype.render = function () {
				viewStack.push(this);
				if (this.getAttribute("bind")) {
					for (var i = 0; i < this.attributes.length; i++) {
						var attribute = this.attributes[i];
						if (attribute.name === "bind" && attribute.interpolator) {
							var model = this.model || {},
							    value = attribute.interpolator(model);
							if (value && value[1]) this.use(value[1]);
							break;
						}
					}
				}
				for (var _i4 = 0; _i4 < this.attributes.length; _i4++) {
					var _attribute = this.attributes[_i4];
					_attribute.render();
				}
				var children = []; // childNodes may change along the way, so solidify
				for (var _i5 = 0; _i5 < this.childNodes.length; _i5++) {
					children.push(this.childNodes[_i5]);
				}var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var child = _step3.value;
						child.render();
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

				viewStack.pop();
				return this;
			};
		}

		_createClass(Fete, [{
			key: "activate",
			value: function activate(object) {
				return _activate(object);
			}
		}, {
			key: "mvc",
			value: function mvc(model, view, controller) {
				var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { reactive: true };

				view instanceof HTMLElement || (view = document.querySelector(view));
				if (!view) {
					throw new Error("Fete.mvc: 'view' undefined");
				}
				var template = options.template;
				if (template) {
					template instanceof HTMLElement || (template = document.querySelector(template));
					if (!template) {
						throw new Error("Fete.mvc: 'options.template' not found " + options.template);
					}
					view.innerHTML = template.innerHTML;
					var viewsource = restoreEntities(view.innerHTML),
					    templatesource = restoreEntities(template.innerHTML);
					if (viewsource !== templatesource) {
						console.log("Template as string ", templatesource);
						console.log("Template as HTML ", viewsource);
						throw new Error("Fete.mvc: Unable to compile. Template may contain invalid HTML.");
					}
					// above happens when template has illegal HTML which may still process correctly in Fete,
					// e.g. <table>${...some functions}</table>; hence, can't be compiled normally.
				}
				model = view.compile(options.reactive).use(model, controller);
				view.render();
				view.addEventListener("click", this.route, false);
				return model;
			}
		}, {
			key: "route",
			value: function route(event) {
				return router(event);
			}
		}]);

		return Fete;
	}();

	if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object") {
		module.exports = Fete;
	} else if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === "object") {
		window.Fete = Fete;
	} else {
		this.Fete = Fete;
	}
}).call(undefined);