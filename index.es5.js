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
			Yes: true,
			No: false,
			"1": true,
			"0": false,
			y: true,
			n: false,
			Y: true,
			N: false
		};
		return !!lookup[value];
	},
	    HTMLElementToJSON = function HTMLElementToJSON(e) {
		var result = {};
		for (var _i = 0; _i < e.attributes.length; _i++) {
			result[e.attributes[_i].name] = e.attributes[_i].value;
		}
		return result;
	},
	    parser = "function(tag,$={},model={}) {\n\t\tfunction parse($,model) { with(model) {\n\t\t\ttry { return tag_src_; }\n\t\t\tcatch(e) { \n\t\t\t\tif(e instanceof ReferenceError) {\n\t\t\t\t\tvar key = e.message.trim().replace(/'/g,'').split(' ')[0];\n\t\t\t\t\tmodel[key] = (typeof(value)!=='undefined' ? value : '');\n\t\t\t\t\treturn parse($,model);\n\t\t\t\t} else throw(e); } } }\n\t\treturn parse($,model);\n\t}",
	    activateProperty = function activateProperty(object, property) {
		var viewmap = object.__views__;
		if (!viewmap) {
			_activate(object);return;
		}
		var getter = function getter() {
			var value = desc.get ? desc.get.call(object) : desc.value;
			if (typeof value !== "function") {
				var views = viewmap.get(property);
				if (!views) {
					views = new Set();
					viewmap.set(property, views);
				}
				views.add(CURRENTVIEW);
			}
			return value;
		};
		getter.feteActivated = true;
		var desc = Object.getOwnPropertyDescriptor(object, property);
		if (desc.get && desc.get.feteAcivated) return;
		Object.defineProperty(object, property, {
			enumerable: desc.enumerable,
			get: getter,
			set: function set(value) {
				var me = this;
				value = _activate(value);
				if (desc.set) desc.set.call(object, value);else if (desc.writable) desc.value = value;
				var views = viewmap.get(property);
				!views || views.forEach(function (view) {
					if (view && (view.parentElement || view.ownerElement)) {
						view.model || view.use(me);
						view.render();
					} else views.delete(view); // garbage collect
				});
				return true;
			}
		});
	},
	    _activate = function _activate(object) {
		if ((typeof object === "undefined" ? "undefined" : _typeof(object)) !== "object" || !object || object.__views__) return object;
		if (Array.isArray(object)) {
			//for(let i=0;i<object.length;i++) object[i] = activate(item[i]);
			// elements are activated on get for performance reasons
			// should we return a Proxy here that will support trapping of new elements and activating??
		} else {
			var viewmap = new Map();
			Object.defineProperty(object, "__views__", { enumerable: false, get: function get() {
					return viewmap;
				}, set: function set() {} });
			Object.keys(object).forEach(function (property) {
				object[property] = _activate(object[property]);
				activateProperty(object, property);
			});
		}
		return object;
	},
	    router = function router(event, next) {
		var target = event.currentTarget,
		    controller = target.controller;
		if (controller) {
			var controllertype = typeof controller === "undefined" ? "undefined" : _typeof(controller),
			    model = target.model || {};
			if (controllertype === "function") controller(event, target.model, target.property, target.normalizedValue);else if (controllertype === "object") {
				var some = void 0;
				if (Object.keys(controller).every(function (key) {
					var state = void 0,
					    rslt = false;
					var test = controller[key].test,
					    view = controller[key].selector ? document.querySelector(controller[key].selector) : target;
					if (event.target.hash) state = event.target.hash.substring(1);else if (typeof test === "function") rslt = test(event, view, model, state);
					if (rslt || state && new RegExp(key).test(state)) {
						event.type === "popstate" || rslt || history.pushState({ href: target.href, view: target.id }, controller[key].title || state);
						if (typeof controller[key].sideffect === "function") controller[key].sideffect(event, view, model);
						some = true;
						return controller[key].cascade;
					}
					return true;
				}) && some) {
					event.preventDefault();
					event.stopPropagation();
				};
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
				if (target.type === "select-multiple") for (var _i2 = 0; target[_i2]; _i2++) {
					if (target[_i2].selected) value.push(target[_i2].value);
				}
			}
			if (["", true, "true"].includes(target.getAttribute("data-two-way")) || fete.options.reactive) model[property] = value;
			target.normalizedValue = value;
		}
		if (focused) {
			focused.focus();
			typeof focused.selectionStart !== "number" || (focused.selectionStart = focused.selectionEnd = focused.value.length);
		}
		router(event);
	},
	    isPropertyName = function isPropertyName(name) {
		var match = /[a-zA-Z_$][0-9a-zA-Z_$]*/.exec(name);
		return match && match[0] === name && Function("try { eval('var " + name + "'); return true; } catch(e) { return false; }")();
	};

	document.addEventListener("change", onchange);
	var _arr = ["keyup", "paste", "cut"];
	for (var _i3 = 0; _i3 < _arr.length; _i3++) {
		var type = _arr[_i3];document.addEventListener(type, onchange);
	}function templateAsValue() {
		var result = [];
		arguments[0][0] === "" || result.push(arguments[0][0]);
		for (var _i4 = 1; _i4 < arguments.length; _i4++) {
			result.push(arguments[_i4]);
			arguments[0][_i4] === "" || result.push(arguments[0][_i4]);
		}
		return result.length === 1 ? result[0] : result;
	}
	function templateAsText() {
		var result = [arguments[0][0]];
		for (var _i5 = 1; _i5 < arguments.length; _i5++) {
			result.push(arguments[_i5]);
			result.push(arguments[0][_i5]);
		}
		return result.join("");
	}

	function include(selector, model) {
		var view = document.createElement("include"),
		    template = document.querySelector(selector);
		view.innerHTML = template.innerHTML;
		model || (model = CURRENTVIEW.model);
		view.use(model);
		return view.compile().render();
	}

	function element(tagName) {
		var attributes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		var model = arguments[2];

		var view = document.createElement(tagName);
		for (var key in attributes) {
			view[key] = attributes[key];
		}model || (model = CURRENTVIEW.model);
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

	var CURRENTVIEW = void 0;

	var IMPORTS = {
		include: include,
		element: element
	},
	    RENDERERS = new Map();

	var Fete = function () {
		function Fete() {
			var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { reactive: true };

			_classCallCheck(this, Fete);

			var fete = this;
			fete.options = Object.assign({}, options);
			fete.customElements = [];

			Object.defineProperty(Node.prototype, "model", { configurable: true, get: function get() {
					var model = this.__model__;
					if (!model && this.parentNode) return this.parentNode.model;
					if (!model && this.ownerElement) return this.ownerElement.model;
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
				!controller || (this.controller = controller);
				return model;
			};
			Node.prototype.render = function (imports) {
				var renderer = RENDERERS.get(this.id);
				if (renderer) return renderer.call(this, imports);
				return this;
			};

			Attr.prototype.compile = function () {
				var me = this,
				    value = me.value,
				    start = value.indexOf("${");
				var property = void 0;
				if (start === 0) {
					var end = value.lastIndexOf("}");
					if (end >= 3) {
						var name = value.substring(2, end);
						if (isPropertyName(name)) property = name;
					}
				}
				if (start >= 0) {
					var interpolate = Function("return " + parser.replace("_src_", "`" + value.trim() + "`"))(),
					    owner = me.ownerElement,
					    render = function render(imports) {
						var current = CURRENTVIEW;
						var owner = CURRENTVIEW = this.ownerElement,
						    result = interpolate(templateAsValue, imports ? Object.assign(imports, IMPORTS) : IMPORTS, this.model);
						if (property) owner.property = property;
						if (this.name === "bind") owner.use(result);else if (this.name === "checked" && owner.type === "radio") {
							if (owner.value == result) owner.checked || (owner.checked = true);
						} else if (owner.type === "checkbox" && this.name === "value") {
							if (owner.value != result) {
								owner.value = result;
								owner.checked = toBoolean(result);
							}
						} else if (owner.type && owner.type.indexOf("select") === 0 && this.name === "value") {
							var values = Array.isArray(result) ? result : [result];
							for (var _i6 = 0; values.length > 0 && owner[_i6]; _i6++) {
								if (values.includes(owner[_i6].value)) owner[_i6].selected || (owner[_i6].selected = true);else owner[_i6].selected = false;
							}
						} else {
							owner[this.name] == result || (owner[this.name] = result);
							if (!["if", "foreach"].includes(this.name)) this.value = result;
						}
						CURRENTVIEW = current;
						return this;
					};
					me.id || (me.id = genId());
					RENDERERS.set(me.id, render);
					owner.interpolated || (owner.interpolated = {});
					owner.interpolated[this.name] || (owner.interpolated[me.name] = {});
					owner.interpolated[this.name].attribute = this;
					if (["if", "foreach"].includes(this.name)) {
						var children = owner.interpolated[me.name].children = [];
						for (var _i7 = 0; _i7 < owner.childNodes.length; _i7++) {
							var child = owner.childNodes[_i7];
							children.push(child.compile());
						}
					}
				}
				return me;
			};
			Text.prototype.compile = function () {
				var me = this,
				    value = me.textContent,
				    start = value.indexOf("${");
				var property = void 0;
				if (start === 0) {
					var end = value.lastIndexOf("}");
					if (end >= 3) {
						var name = value.substring(2, end);
						if (isPropertyName(name)) property = name;
					}
				}
				if (start >= 0) {
					var replacement = document.createElement("interpolation"),
					    interpolate = Function("return " + parser.replace("_src_", "`" + value.trim() + "`"))();
					var render = function render(imports) {
						var current = CURRENTVIEW,
						    model = this.model;
						!property || (this.property = property);
						CURRENTVIEW = this;
						if (property) {
							if (property === "model") this.innerHTML = model;else replacement.innerHTML = model[property];
						} else {
							replacement.innerHTML = "";
							var result = interpolate(templateAsValue, imports ? Object.assign({}, IMPORTS, imports) : IMPORTS, model);
							if (result instanceof Node) replacement.appendChild(result);else if (Array.isArray(result)) {
								for (var _i8 = 0; _i8 < result.length; _i8++) {
									var _value = result[_i8];
									if (_value instanceof Node) replacement.appendChild(_value);else replacement.appendChild(document.createTextNode(_value));
								}
							} else replacement.innerHTML = result;
						}
						CURRENTVIEW = current;
						return replacement;
					};
					replacement.render = render;
					me.parentElement.replaceChild(replacement, me);
					return replacement;
				}
				return me;
			};
			HTMLElement.prototype.compile = function (twoway) {
				var me = this,
				    tagname = me.tagName.toLowerCase();
				var custom = fete.customElements[tagname];
				if (custom && custom.options) {
					!custom.options.transform || (me = custom.options.transform(me));
					!custom.options.classNames || custom.options.classNames.forEach(function (className) {
						if (!me.classNames) {
							me.class = className;
						} else {
							me.classNames.add(className);
						}
					});
					!custom.options.controller || (me.controller = custom.options.controller);
				}
				if (me !== this) this.parentElement.replaceChild(me.compile(twoway), this);
				if (me.outerHTML.indexOf("${") >= 0) {
					for (var _i9 = 0; _i9 < me.attributes.length; _i9++) {
						var attribute = me.attributes[_i9];
						attribute.compile();
					}
					for (var _i10 = 0; _i10 < me.childNodes.length; _i10++) {
						var child = me.childNodes[_i10];
						if (child instanceof Text) {
							var txt = child.textContent;
							if (txt.length === 0) {
								me.removeChild(child);
								_i10--;
								continue;
							}
							if (txt.trim().length === 0) {
								me.replaceChild(document.createTextNode(" "), child);
								continue;
							}
						} else if (child instanceof HTMLInputElement && twoway) child.setAttribute("data-two-way", true);
						child.compile(twoway);
					}
				}
				return me;
			};
			HTMLElement.prototype.render = function (imports) {
				var me = this,
				    current = CURRENTVIEW;
				CURRENTVIEW = me;
				var model = me.model;
				for (var _i11 = 0; _i11 < me.attributes.length; _i11++) {
					me.attributes[_i11].render(imports);
				} // initialize model, perhaps do everything here and just have onchange drive a render update??
				if (model && me.property && (["", true, "true"].includes(me.getAttribute("data-two-way")) || fete.options.reactive)) {
					var _value2 = model[me.property],
					    type = _value2 === "" ? "undefined" : typeof _value2 === "undefined" ? "undefined" : _typeof(_value2);
					if (type === "undefined") {
						if (me.type === "radio" || me.type === "checkbox") {
							model[me.property] = toBoolean(me.value);
						} else if (me.type === "select-one") {
							model[me.property] = me.value;
						} else if (me.type === "select-multiple") {
							model[me.property] = [];
						}
						// since the property may have been undefined, activate it (no-op if already activated)
						activateProperty(model, me.property);
					}
				}
				if (me.interpolated) {
					var attributes = me.interpolated;
					if (attributes.if) {
						if (!me.if) {
							me.innerHTML = "";
							CURRENTVIEW = current;
							return me;
						}
						if (!attributes.foreach) {
							var iff = attributes.if,
							    _children = iff.children;
							me.innerHTML = "";
							for (var j = 0; j < _children.length; j++) {
								var child = _children[j];
								child.use(value);
								me.appendChild(child.render({ this: target, key: i }).cloneNode(true));
							}
							CURRENTVIEW = current;
							return me;
						}
					}
					if (me.foreach) {
						var foreach = attributes.foreach,
						    _children2 = foreach.children;
						var _target = me.foreach;
						me.innerHTML = "";
						if (!Array.isArray(_target)) {
							var object = _target;
							_target = [];
							for (var key in object) {
								_target.push(object[key]);
							}
						}
						for (var _i12 = 0; _i12 < _target.length; _i12++) {
							var _value3 = _target[_i12];
							for (var _j = 0; _j < _children2.length; _j++) {
								var _child = _children2[_j];
								_child.use(_value3);
								me.appendChild(_child.render({ this: _target, key: _i12 }).cloneNode(true));
							}
						}
						CURRENTVIEW = current;
						return me;
					}
				}
				var children = [];
				for (var _i13 = 0; _i13 < me.children.length; _i13++) {
					children.push(me.children[_i13]);
				}for (var _i14 = 0; _i14 < children.length; _i14++) {
					children[_i14].render(imports);
				}CURRENTVIEW = current;
				return me;
			};
		}

		_createClass(Fete, [{
			key: "activate",
			value: function activate(object) {
				return _activate(object);
			}
		}, {
			key: "createComponent",
			value: function createComponent(name, html, controller) {
				var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { reactive: true };

				var fete = this,
				    componentTemplate = "class _nm_ extends e {\n\t\t\t\tconstructor(m) { const args = [].slice.call(arguments,1); super(...arguments); this.model = m; this.html = h; this.controller = ctrlr; }\n\t\t\t\trender(v,m,c) {\to = Object.assign({},o); o.html = this.html; return f.mvc(m||this.model,v,c||this.controller,o); }\n\t\t\t}";
				var _extend = options.extends || options.extend;
				typeof _extend === "function" || (_extend = function extend() {
					Object.assign(this, _extend || {});
				});
				return new Function("f", "e", "h", "ctrlr", "o", "return " + componentTemplate.replace("_nm_", name))(fete, _extend, html, controller, options);
			}
		}, {
			key: "define",
			value: function define(name) {
				var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { reactive: true };

				this.customElements[name] = {
					options: Object.assign({}, options)
				};
			}
		}, {
			key: "interpolate",
			value: function interpolate(string, scope) {
				var interpolator = Function("return " + parser.replace("_src_", "`" + string + "`"))();
				!(scope instanceof HTMLElement) || (scope = HTMLElementToJSON(scope));
				return interpolator(templateAsText, {}, scope);
			}
		}, {
			key: "mvc",
			value: function mvc(model, view, controller) {
				var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { reactive: true };

				view instanceof HTMLElement || (view = document.querySelector(view));
				if (!view) {
					throw new Error("Fete.mvc: 'view' undefined");
				}
				var innerHTML = void 0,
				    template = options.template;
				if (template) {
					template instanceof HTMLElement || (template = document.querySelector(template));
					if (!template) {
						throw new Error("Fete.mvc: 'options.template' not found " + options.template);
					}
					if (options.transform) view.appendChild(options.transform(template.innerHTML));else innerHTML = options.transform ? options.transform(template.innerHTML) : template.innerHTML;
				} else if (options.html) innerHTML = options.transform ? options.transform(options.html) : options.html;
				if (innerHTML) {
					view.innerHTML = innerHTML;
					if (options.html) {
						var viewsource = restoreEntities(view.innerHTML),
						    templatesource = restoreEntities(options.html);
						if (!options.transform && viewsource !== templatesource) console.log("Warning: Template and view HTML mismatch. May contain invalid HTML or fragment outside a div. Rendering may be incorrect.");
					}
				}
				model = view.compile(options.reactive).use(model, controller);
				if (options.initialize) options.initialize(view);
				view.render().onclick = this.route;
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

	if ((typeof exports === "undefined" ? "undefined" : _typeof(exports)) === "object") module.exports = Fete;else if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === "object") window.Fete = Fete;else this.Fete = Fete;
}).call(undefined);