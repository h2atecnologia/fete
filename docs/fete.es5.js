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
	    parser = "function(tag,$={},model={}) {\n\t\tfunction parse($,model) {\n\t\t\twith(model) {\n\t\t\t\ttry { return tag_src_; }\n\t\t\t\tcatch(e) { \n\t\t\t\t\tif(e instanceof ReferenceError) {\n\t\t\t\t\t\tvar key = e.message.trim().replace(/'/g,'').split(' ')[0];\n\t\t\t\t\t\tmodel[key] = (typeof(value)!=='undefined' ? value : '');\n\t\t\t\t\t\treturn parse($,model);\n\t\t\t\t\t} else throw(e);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\treturn parse($,model);\n\t}",
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
					//views.add(viewStack.current);
					views.add(CURRENTVIEW);
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
				if (target.type === "select-multiple") for (var _i = 0; target[_i]; _i++) {
					if (target[_i].selected) value.push(target[_i].value);
				}
			}
			if (["", true, "true"].includes(target.getAttribute("data-two-way")) || fete.options.reactive) model[property] = value;
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
	for (var _i2 = 0; _i2 < _arr.length; _i2++) {
		var type = _arr[_i2];document.addEventListener(type, onchange);
	}function templateAsValue() {
		var result = [];
		arguments[0][0] === "" || result.push(arguments[0][0]);
		for (var _i3 = 1; _i3 < arguments.length; _i3++) {
			result.push(arguments[_i3]);
			arguments[0][_i3] === "" || result.push(arguments[0][_i3]);
		}
		return result.length === 1 ? result[0] : result;
	}
	function templateAsText() {
		var result = [arguments[0][0]];
		for (var _i4 = 1; _i4 < arguments.length; _i4++) {
			result.push(arguments[_i4]);
			result.push(arguments[0][_i4]);
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
				this.controller = controller;
				return model;
			};
			Node.prototype.render = function (imports) {
				var renderer = RENDERERS.get(this.id);
				if (renderer) return renderer.call(this, imports);
				return this;
			};

			Attr.prototype.compile = function () {
				var start = this.value.indexOf("$");
				if (start >= 0) {
					var interpolate = Function("return " + parser.replace("_src_", "`" + this.value.trim() + "`"))(),
					    render = function render(imports) {
						var current = CURRENTVIEW;
						var owner = CURRENTVIEW = this.ownerElement,
						    value = interpolate(templateAsValue, imports ? Object.assign(imports, IMPORTS) : IMPORTS, this.model);
						//!Array.isArray(value) || (value = value.filter(item => typeof(item)!=="undefined"));
						if (start === 0) {
							//(this.name==="value" || owner.type==="radio") && 
							var end = this.value.lastIndexOf("}");
							if (end >= 3) {
								var property = this.value.substring(2, end);
								if (property.indexOf(" ") === -1) owner.property = property; // should use a RegExp
							}
						}
						if (this.name === "bind") owner.use(value);else if (this.name === "checked" && owner.type === "radio") {
							if (owner.value == value) owner.checked || (owner.checked = true);
						} else if (owner.type === "checkbox" && this.name === "value") {
							if (owner.value != value) {
								owner.value = value;
								owner.checked = toBoolean(value);
							}
						} else if (owner.type && owner.type.indexOf("select") === 0 && this.name === "value") {
							var values = Array.isArray(value) ? value : [value];
							for (var _i5 = 0; values.length > 0 && owner[_i5]; _i5++) {
								if (values.includes(owner[_i5].value)) owner[_i5].selected || (owner[_i5].selected = true);else owner[_i5].selected = false;
							}
						} else {
							owner[this.name] == value || (owner[this.name] = value);
							if (!["if", "foreach"].includes(this.name)) this.value = value;
						}
						CURRENTVIEW = current;
						return this;
					};
					this.id || (this.id = genId());
					RENDERERS.set(this.id, render);
					this.ownerElement.interpolatedAttributes || (this.ownerElement.interpolatedAttributes = {});
					this.ownerElement.interpolatedAttributes[this.name] || (this.ownerElement.interpolatedAttributes[this.name] = {});
					this.ownerElement.interpolatedAttributes[this.name].attribute = this;
					if (["if", "foreach"].includes(this.name)) {
						var children = this.ownerElement.interpolatedAttributes[this.name].children = [];
						for (var _i6 = 0; _i6 < this.ownerElement.childNodes.length; _i6++) {
							var child = this.ownerElement.childNodes[_i6];
							children.push(child.compile());
						}
						//this.ownerElement.style.display = "none";
					}
				}
				return this;
			};
			Text.prototype.compile = function () {
				if (this.textContent.indexOf("$") >= 0) {
					var replacement = document.createElement("interpolation"),
					    interpolate = Function("return " + parser.replace("_src_", "`" + this.textContent.trim() + "`"))();
					var render = function render(imports) {
						var current = CURRENTVIEW;
						CURRENTVIEW = this;
						replacement.innerHTML = "";
						var result = interpolate(templateAsValue, imports ? Object.assign({}, IMPORTS, imports) : IMPORTS, this.model);
						if (result instanceof Node) replacement.appendChild(result);else if (Array.isArray(result)) {
							for (var _i7 = 0; _i7 < result.length; _i7++) {
								var _value = result[_i7];
								if (_value instanceof Node) replacement.appendChild(_value);else replacement.appendChild(document.createTextNode(_value));
							}
						} else replacement.innerHTML = result;
						CURRENTVIEW = current;
						return replacement;
					};
					replacement.render = render;
					this.parentElement.replaceChild(replacement, this);
					return replacement;
				}
				return this;
			};
			HTMLElement.prototype.compile = function (twoway) {
				if (this.outerHTML.indexOf("${") >= 0) {
					for (var _i8 = 0; _i8 < this.attributes.length; _i8++) {
						var attribute = this.attributes[_i8];
						attribute.compile();
					}
					for (var _i9 = 0; _i9 < this.childNodes.length; _i9++) {
						var child = this.childNodes[_i9];
						if (child instanceof Text) {
							var txt = child.textContent;
							if (txt.length === 0) {
								this.removeChild(child);
								_i9--;
								continue;
							}
							if (txt.trim().length === 0) this.replaceChild(document.createTextNode(" "), child);
						} else if (child instanceof HTMLInputElement && twoway) child.setAttribute("data-two-way", true);
						this.childNodes[_i9].compile();
					}
				}
				return this;
			};
			HTMLElement.prototype.render = function (imports) {
				var current = CURRENTVIEW;
				CURRENTVIEW = this;
				for (var _i10 = 0; _i10 < this.attributes.length; _i10++) {
					this.attributes[_i10].render(imports);
				}if (this.interpolatedAttributes) {
					var attributes = this.interpolatedAttributes;
					if (attributes.if) {
						if (!this.if) {
							this.innerHTML = "";
							CURRENTVIEW = current;
							return;
						}
						if (!attributes.foreach) {
							var iff = attributes.if,
							    _children = iff.children;
							this.innerHTML = "";
							for (var j = 0; j < _children.length; j++) {
								var child = _children[j];
								child.use(value);
								this.appendChild(child.render({ this: target, key: i }).cloneNode(true));
							}
							CURRENTVIEW = current;
							return this;
						}
					}
					if (this.foreach) {
						var foreach = attributes.foreach,
						    _children2 = foreach.children;
						var _target = this.foreach;
						this.innerHTML = "";
						if (!Array.isArray(_target)) {
							var object = _target;
							_target = [];
							for (var key in object) {
								_target.push(object[key]);
							}
						}
						for (var _i11 = 0; _i11 < _target.length; _i11++) {
							var _value2 = _target[_i11];
							for (var _j = 0; _j < _children2.length; _j++) {
								var _child = _children2[_j];
								_child.use(_value2);
								this.appendChild(_child.render({ this: _target, key: _i11 }).cloneNode(true));
							}
						}
						CURRENTVIEW = current;
						return this;
					}
				}
				var children = [];
				for (var _i12 = 0; _i12 < this.children.length; _i12++) {
					children.push(this.children[_i12]);
				}for (var _i13 = 0; _i13 < children.length; _i13++) {
					var _child2 = children[_i13];
					_child2.render(imports);
				}
				CURRENTVIEW = current;
				return this;
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
				    componentTemplate = "class _nm_ extends e {\n\t\t\t\tconstructor(m) {\n\t\t\t\t\tconst args = [].slice.call(arguments,1);\n\t\t\t\t\tsuper(...arguments);\n\t\t\t\t\tthis.model = m;\n\t\t\t\t\tthis.html = html;\n\t\t\t\t\tthis.controller = ctrlr;\n\t\t\t\t}\n\t\t\t\trender(v,m,c) {\n\t\t\t\t\to = Object.assign({},o);\n\t\t\t\t\to.html = this.html;\n\t\t\t\t\treturn f.mvc(this.model||this,v,this.controller,o);\n\t\t\t\t}\n\t\t\t}";
				var _extend = options.extend;
				typeof _extend === "function" || (_extend = function extend() {
					Object.assign(this, _extend || {});
				});
				return new Function("f", "e", "h", "ctrlr", "o", "return " + componentTemplate.replace("_nm_", name))(fete, _extend, html, controller, options);
			}
		}, {
			key: "mvc",
			value: function mvc(model, view, controller) {
				var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { reactive: true };

				view instanceof HTMLElement || (view = document.querySelector(view));
				if (!view) {
					throw new Error("Fete.mvc: 'view' undefined");
				}
				var innerHTML = options.html,
				    template = options.template;
				if (template) {
					template instanceof HTMLElement || (template = document.querySelector(template));
					if (!template) {
						throw new Error("Fete.mvc: 'options.template' not found " + options.template);
					}
					innerHTML = template.innerHTML;
				}
				if (innerHTML) {
					view.innerHTML = innerHTML;
					var viewsource = restoreEntities(view.innerHTML),
					    templatesource = restoreEntities(innerHTML);
					if (viewsource !== templatesource) console.log("Warning: Template HTML and view HTML mismatch. May contain invalid HTML or HTML fragment outside a div. Rendering may be incorrect.");
				}
				model = view.compile(options.reactive).use(model, controller);
				//view.render().addEventListener("click", this.route, true);
				view.render().onclick = this.route; // the above should work, but does not, addEventListener always results in teh currentTarget being document
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