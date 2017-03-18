"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function () {
	"use strict";

	function deepFreeze(object) {
		!object || (typeof Object === "undefined" ? "undefined" : _typeof(Object)) !== object || Object.getOwnPropertyNames(object).forEach(function (key) {
			var value = obj[key];
			if (value && (typeof value === "undefined" ? "undefined" : _typeof(value)) === 'object') deepFreeze(value);
		});
		return Object.freeze(object);
	}

	function routeHandler(e) {
		if (e.target.tagName === "A" && e.target.host === window.location.host && e.target.hash) F.rtr(e, function (allow) {
			if (!allow) {
				e.preventDefault();
			}
		});
	}
	function popHandler(event) {
		if (!event.state) return;
		var prsr = document.createElement("a"),
		    view = document.getElementById(event.state.view);
		event.retarget = view;
		prsr.href = event.state.href;
		var _arr = ["href", "origin", "host", "protocol", "hostname", "pathname", "hash", "search"];
		for (var _i = 0; _i < _arr.length; _i++) {
			var key = _arr[_i];event.target[key] = prsr[key];
		}F.rtr(event);
	}
	window.addEventListener("popstate", popHandler);
	var F = {
		cView: null,
		rndrs: new Map(),
		imprts: {
			$import: function $import(selector) {
				var scope = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
				var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { reactive: true };

				var template = document.querySelector(selector),
				    view = document.createElement("span");
				if (!template) throw new Error("Template not found " + selector);
				view.innerText = template.innerHTML.replace(/<(?=[A-Za-z\/]+?\>)/g, "\\u003c").replace(/(?=[A-Za-z]+?)>/g, "\\u003e").replace(/\&gt;/g, ">").replace(/\&lt;/g, "<");
				F.bnd(scope, view, options);
				return "<!DOCTYPE html>" + view.innerText.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">");
			},
			$forEach: function $forEach(iterable, callback) {
				var html = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

				var str = "";
				iterable.forEach(function (item, index, iterable) {
					str += callback(item, index, iterable);
				});
				return (html ? "<!DOCTYPE html>" : "") + str;
			}
		},
		actvt: function actvt(model) {
			if (!model || model._views) return model;
			Object.defineProperty(model, "_views", { enumerable: false, value: new Map() });
			var proxy = new Proxy(model, {
				set: function set(target, property, value) {
					if (target[property] !== value) {
						target[property] = value;
						target._views.forEach(function (properties, view) {
							if (properties[property]) {
								if ((!view.style || view.style.display !== "none") && (!view.parentNode || view.parentNode.style.display != "none")) {
									var rndrs = F.rndrs.get(view);
									if (rndrs) {
										var _iteratorNormalCompletion = true;
										var _didIteratorError = false;
										var _iteratorError = undefined;

										try {
											for (var _iterator = rndrs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
												var _rndrer = _step.value;
												_rndrer(proxy);
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
									}
								}
							}
						});
					}
					return true;
				},
				get: function get(target, property) {
					if (F.cView && typeof property === "string") {
						var properties = target._views.get(F.cView) || {};
						properties[property] = true;
						target._views.set(F.cView, properties);
					}
					return target[property];
				}
			});
			return proxy;
		},
		cmpl: function cmpl(view) {
			var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { reactive: true };

			!options.reset || F.rndrs.delete(view);
			var prntrndrs = F.rndrs.get(view);
			if (prntrndrs) return prntrndrs;
			prntrndrs = [];
			F.rndrs.set(view, prntrndrs);
			if (options.template) {
				var model = view.model;
				if (options.template instanceof HTMLElement) {
					view.innerHTML = options.template.innerHTML;
				} else if (options.template.indexOf("`") === 0 && options.template.lastIndexOf("`") === options.template.length - 1) {
					view.innerHTML = options.template.substring(1, options.template.length - 1);
				} else {
					var template = document.querySelector(options.template);
					if (!template) throw new Error("missing template " + options.template);
					view.innerHTML = template.innerHTML;
				}
				view.model = model;
			}
			//if((view.innerHTML && view.innerHTML.indexOf("${")===-1) || (view.wholeText && view.wholeText.indexOf("${")===-1)) return;
			var elements = view.childNodes;

			var _loop = function _loop(i) {
				var element = elements[i];
				element.controller = view.controller;
				element.ftLstnrs || (element.ftLstnrs = new Set());
				var ttnLstnrs = element.ftLstnrs;
				element.ftLstnrs.forEach(function (listener) {
					var _arr2 = ["change", "keyup", "paste", "cut"];

					for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
						var type = _arr2[_i2];element.removeEventListener(type, listener);
					}
				});
				element.ftLstnrs.clear();
				if (!(element instanceof Text)) F.cmpl(element, { reactive: options.reactive, reset: options.reset });
				var rndrs = [],
				    keys = [];
				F.rndrs.set(element, rndrs);
				if (element.attributes) for (var j = 0; j < element.attributes.length; j++) {
					keys.push(element.attributes[j].name);
				}
				if (element instanceof Text) keys.push("wholeText");
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					var _loop2 = function _loop2() {
						var key = _step2.value;

						var template = typeof element === "string" ? element : (element.getAttribute ? element.getAttribute(key) : element[key]) || element[key],
						    type = typeof template === "undefined" ? "undefined" : _typeof(template);
						if (type === "string" && template.indexOf("${") >= 0) {
							var property = template.substring(2, template.lastIndexOf("}"));
							property.split(" ").length === 1 || (property = undefined);
							rndrs.push(function (model) {
								if (element.model && element.model != model) element.model._views.delete(element);
								element.model = model;
								var replacement = F.interpolator(template, element, model, key, property);
								if (replacement !== element) {
									element.ftLstnrs.forEach(function (listener) {
										var _arr3 = ["change", "keyup", "paste", "cut"];

										for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
											var _type = _arr3[_i3];element.removeEventListener(_type, listener);
										}
									});
									element.ftLstnrs.clear();
									F.cmpl(replacement, { reactive: options.reactive, reset: options.reset });
									element = replacement;
									element.ftLstnrs = new Set();
								}
								if (property && (options.reactive || view.getAttribute("data-reactive"))) {
									var listener = function listener(event) {
										if (event.target.type === "checkbox") model[property] = event.target.checked;else if (event.target.type === "select-multiple") {
											var values = [];
											for (var _i4 = 0; event.target[_i4]; _i4++) {
												if (event.target[_i4].selected) values.push(event.target[_i4].value);
											}model[property] = values;
										} else model[property] = event.target.value;
										event.target.model = model;
										F.rtr(event);
									};
									element.ftLstnrs.add(listener);
									element.addEventListener("change", listener);
									if ((element.tagName === "INPUT" || element.tagName === "TEXTAREA") && !["button", "radio", "checkbox"].includes(element.type)) {
										var _arr4 = ["keyup", "paste", "cut"];

										for (var _i5 = 0; _i5 < _arr4.length; _i5++) {
											var _type2 = _arr4[_i5];element.addEventListener(_type2, listener);
										}
									}
								}
							});
						}
					};

					for (var _iterator2 = keys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						_loop2();
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
			};

			for (var i = 0; i < elements.length; i++) {
				_loop(i);
			}
		},
		interpolator: function interpolator(template, view, model, key, property) {
			var rslt = F.cView = view;
			var doit = new Function("doit", "let __val__=''; with(this) { try { __val__ = `" + template + "` }" + "catch(e) { if(e instanceof ReferenceError) {" + "this[e.message.trim().replace(/\'/g,'').split(' ')[0]] = '';" + "return doit.call(this,doit); }}} return __val__;");
			var scope = model ? model : {};
			for (var _key in F.imprts) {
				Object.defineProperty(scope, _key, { enumerable: false, configurable: true, writable: false, value: F.imprts[_key] });
			}var value = doit.call(scope, doit);
			for (var _key2 in F.imprts) {
				delete scope[_key2];
			}if (view.type === 'radio' && property) {
				if (key === 'checked' && view.checked) view[key] = scope[property] = view.value;
			} else if (view.type === 'checkbox' && property) {
				if (key === 'checked') view[key] = scope[property] = value === "on" || value === "true" || false;
			} else if (view.type === 'select-one' && property) {
				scope[property] = view.value;
			} else if (view.type === 'select-multiple' && property) {
				if (!scope[property]) scope[property] = [];
			} else if (view.type === 'textarea' && property) {
				view[key] = scope[property] = view.value;
			} else if (key === "wholeText") {
				var node = void 0;
				if (value.trim().toLowerCase().indexOf("<!doctype html>") === 0) {
					node = document.createElement("span");
					node.innerHTML = value.trim().substring(15);
				} else node = document.createTextNode(value);
				view.parentNode.replaceChild(node, view);
				node.model = model;
				//model._views.delete(view);
				//model._views.add(node);
				rslt = node;
			} else view[key] === value || (view[key] = value);
			F.cView = null;
			return rslt;
		},
		rndr: function rndr(view, model, options) {
			var elements = view.childNodes;
			for (var i = 0; i < elements.length; i++) {
				F.rndr(elements[i], model, options);
			}view.model = model;
			var rndrs = F.rndrs.get(view);
			if (rndrs) {
				var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = rndrs[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var _rndrer2 = _step3.value;
						_rndrer2(model);
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
			}
		},
		bnd: function bnd(model, view, controller) {
			var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : { reactive: true };

			(typeof view === "undefined" ? "undefined" : _typeof(view)) === "object" || (view = document.querySelector(view));
			if (!view) {
				throw new Error("F.bnd: 'view' undefined");
			}

			F.rndrs.delete(view);
			view.controller = controller;
			view.addEventListener("click", routeHandler, false);

			model = F.actvt(model);
			F.cmpl(view, options);
			F.rndr(view, model, { reactive: options.reactive });
			return model;
		},
		rtr: function rtr(event, next) {
			var target = event.retarget || event.target,
			    cntrlr = target.controller;
			var model = target.model ? JSON.parse(JSON.stringify(target.model)) : {};
			deepFreeze(model);
			!cntrlr || Object.keys(cntrlr).every(function (key) {
				var state = void 0,
				    test = cntrlr[key].test,
				    rslt = false;;
				if (target.hash) state = target.hash.substring(1);else if (typeof test === "function") rslt = test(event, model);
				if (rslt || state && new RegExp(key).test(state)) {
					target.id || (target.id = (Math.random() + "").substring(2));
					event.type === "popstate" || rslt || history.pushState({ href: target.href, view: target.id }, cntrlr[key].title || state);
					var view = cntrlr[key].selector ? document.querySelector(cntrlr[key].selector) : target;
					if (typeof cntrlr[key].sideffect === "function") cntrlr[key].sideffect(event, view, model);
					return cntrlr[key].cascade;
				}
				return true;
			});
			event.preventDefault();
			event.stopPropagation();
			!next || next();
		}
	};
	var Fete = {
		activate: F.actvt,
		bind: F.bnd,
		imports: F.imprts
	};
	if (typeof module !== "undefined") {
		module.export = Fete;
	} else if (typeof this !== "undefined") {
		this.Fete = Fete;
	} else {
		window.Fete = Fete;
	}
}).call(undefined);