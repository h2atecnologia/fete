(function() {
	"use strict";
	function deepFreeze(object) {
	  !object || typeof(Object)!==object || Object.getOwnPropertyNames(object).forEach((key) => {
	    var value = obj[key];
	    if (value && typeof value === 'object')
	      deepFreeze(value);
	  });
	  return Object.freeze(object);
	}

	function routeHandler(e) {
		if(e.target.tagName==="A" && e.target.host===window.location.host && e.target.hash) F.rtr(e,(allow) => { if(!allow) { e.preventDefault(); }});
	}
	function popHandler(event) {
		if(!event.state) return;
		const prsr = document.createElement("a"),
			view = document.getElementById(event.state.view);
		event.retarget = view;
		prsr.href = event.state.href;
		for(let key of ["href","origin","host","protocol","hostname","pathname","hash","search"]) event.target[key] = prsr[key];
		F.rtr(event);
	}
	window.addEventListener("popstate",popHandler);
	const F = {
			cView: null,
			rndrs: new Map(),
			imprts: {
				$import: function(selector,scope={},options={reactive:true}) { 
					const template = document.querySelector(selector),
					view = document.createElement("span");
					if(!template) throw new Error("Template not found " + selector);
					view.innerText = template.innerHTML.replace(/<(?=[A-Za-z\/]+?\>)/g,"\\u003c").replace(/(?=[A-Za-z]+?)>/g,"\\u003e").replace(/\&gt;/g,">").replace(/\&lt;/g,"<");
					F.bnd(scope,view,options);
					return "<!DOCTYPE html>"+view.innerText.replace(/\\u003c/g,"<").replace(/\\u003e/g,">");
				},
				$forEach(iterable,callback,html=false) {
					let str = "";
					iterable.forEach((item,index,iterable) => {
						str += callback(item,index,iterable);
					});
					return (html ? "<!DOCTYPE html>" : "") + str;
				}
			},
			actvt: function(model) {
				if(!model || model._views) return model;
				Object.defineProperty(model,"_views",{enumerable:false,value:new Map()});
				const proxy = new Proxy(model,{ 
					set: (target,property,value) => {
						if(target[property]!==value) {
							target[property] = value;
							target._views.forEach((properties,view) => {
								if(properties[property]) {
									if((!view.style || view.style.display!=="none") && (!view.parentNode || view.parentNode.style.display!="none")) {
										const rndrs = F.rndrs.get(view);
										if(rndrs) for(let rndrer of rndrs) rndrer(proxy);
									}
								}
							});
						}
						return true;
					},
					get: (target,property) => {
						if(F.cView && typeof(property)==="string") {
							const properties = target._views.get(F.cView) || {};
							properties[property]=true;
							target._views.set(F.cView,properties)
						}
						return target[property];
					}
				});
				return proxy;
			},
			cmpl: function(view,options={reactive:true}) {
				!options.reset || F.rndrs.delete(view);
				let prntrndrs = F.rndrs.get(view);
				if(prntrndrs) return prntrndrs;
				prntrndrs = [];
				F.rndrs.set(view,prntrndrs);
				if(options.template) {
					const model = view.model;
					if(options.template instanceof HTMLElement) {
						view.innerHTML = options.template.innerHTML;
					} else if(options.template.indexOf("`")===0 && options.template.lastIndexOf("`")===options.template.length-1) {
						view.innerHTML = options.template.substring(1,options.template.length-1);
					} else {
						let template = document.querySelector(options.template); 
						if(!template) throw new Error("missing template " + options.template);
						view.innerHTML = template.innerHTML;
					}
					view.model = model;
				}
				//if((view.innerHTML && view.innerHTML.indexOf("${")===-1) || (view.wholeText && view.wholeText.indexOf("${")===-1)) return;
				const elements = view.childNodes;
				for(let i=0;i<elements.length;i++) {
					let element = elements[i];
					element.controller = view.controller;
					element.ftLstnrs || (element.ftLstnrs=new Set());
					const ttnLstnrs = element.ftLstnrs;
					element.ftLstnrs.forEach((listener) => {
						for(let type of ["change","keyup","paste","cut"]) element.removeEventListener(type,listener);
					});
					element.ftLstnrs.clear();
					if(!(element instanceof Text)) F.cmpl(element,{reactive:options.reactive,reset:options.reset});
					const rndrs = [], keys = [];
					F.rndrs.set(element,rndrs);
					if(element.attributes) for(let j=0;j<element.attributes.length;j++) { keys.push(element.attributes[j].name); }
					if(element instanceof Text) keys.push("wholeText");
					for(let key of keys) {
						const template = (typeof(element)==="string" ? element : (element.getAttribute ? element.getAttribute(key) : element[key]) || element[key]),
						type = typeof(template);
						if(type==="string" && template.indexOf("${")>=0) {
							let property = template.substring(2,template.lastIndexOf("}"));
							property.split(" ").length===1 || (property=undefined);
							rndrs.push((model) => {
								if(element.model && element.model!=model) element.model._views.delete(element);
								element.model = model;
								const replacement = F.interpolator(template,element,model,key,property);
								if(replacement!==element) {
									element.ftLstnrs.forEach((listener) => {
										for(let type of ["change","keyup","paste","cut"]) element.removeEventListener(type,listener);
									});
									element.ftLstnrs.clear();
									F.cmpl(replacement,{reactive:options.reactive,reset:options.reset});
									element = replacement;
									element.ftLstnrs = new Set();
								}
								if(property && (options.reactive || view.getAttribute("data-reactive"))) {
									const listener = (event) => {
										if(event.target.type==="checkbox") model[property] = event.target.checked;
										else if(event.target.type==="select-multiple") {
											const values = [];
											for(let i=0;event.target[i];i++) if(event.target[i].selected) values.push(event.target[i].value);
											model[property] = values;
										} else model[property] = event.target.value;
										event.target.model = model;
										F.rtr(event);
									}
									element.ftLstnrs.add(listener);
									element.addEventListener("change",listener);
									if((element.tagName==="INPUT" || element.tagName==="TEXTAREA") && !["button","radio","checkbox"].includes(element.type)) {
										for(let type of ["keyup","paste","cut"]) element.addEventListener(type,listener);
									}
								}
							});
						}
					}
				}
			},
			interpolator: function(template,view,model,key,property) {
				let rslt = F.cView = view;
				const doit = new Function("doit", 
					"let __val__=''; with(this) { try { __val__ = `"+template+"` }" + 
					"catch(e) { if(e instanceof ReferenceError) {" + 
					"this[e.message.trim().replace(/\'/g,'').split(' ')[0]] = '';" + 
					"return doit.call(this,doit); }}} return __val__;"
				);
				const scope = (model ? model : {});
				for(let key in F.imprts) Object.defineProperty(scope,key,{enumerable:false,configurable:true,writable:false,value:F.imprts[key]});
				const value = doit.call(scope,doit);
				for(let key in F.imprts) delete scope[key];
				if(view.type==='radio' && property) {
					if(key==='checked' && view.checked) view[key] = scope[property] = view.value;
				} else if(view.type==='checkbox' && property) {
					if(key==='checked') view[key] = scope[property] = value==="on" || value==="true" || false;
				} else if(view.type==='select-one' && property) {
					scope[property] = view.value;
				} else if(view.type==='select-multiple' && property) {
					if(!scope[property]) scope[property]=[];
				} else if(view.type==='textarea' && property) {
					view[key] = scope[property] = view.value;
				} else if(key==="wholeText") {
					let node;
					if(value.trim().toLowerCase().indexOf("<!doctype html>")===0) {
						node = document.createElement("span");
						node.innerHTML = value.trim().substring(15);
					} else node = document.createTextNode(value);
					view.parentNode.replaceChild(node,view);
					node.model = model;
					//model._views.delete(view);
					//model._views.add(node);
					rslt = node;
				} else view[key]===value || (view[key] = value);
				F.cView = null;
				return rslt;
			},
			rndr: function(view,model,options) {
				const elements = view.childNodes;
				for(let i=0;i<elements.length;i++) F.rndr(elements[i],model,options);
				view.model = model;
				const rndrs = F.rndrs.get(view);
				if(rndrs) for(let rndrer of rndrs) rndrer(model);
			},
			bnd: function(model,view,controller,options={reactive:true}) {
				typeof(view)==="object" || (view=document.querySelector(view));
				if(!view) { throw new Error("F.bnd: 'view' undefined"); }
				
				F.rndrs.delete(view);
				view.controller = controller;
				view.addEventListener("click", routeHandler, false);

				model = F.actvt(model);
				F.cmpl(view,options);
				F.rndr(view,model,{reactive:options.reactive});
				return model;
			},
			rtr: function(event,next) {
				const target = event.retarget || event.target,
					cntrlr = target.controller;
				const model = (target.model ? JSON.parse(JSON.stringify(target.model)) : {});
				deepFreeze(model);
				!cntrlr || Object.keys(cntrlr).every((key) => {
					let state, test = cntrlr[key].test, rslt = false;;
					if(target.hash) state = target.hash.substring(1);
					else if(typeof(test)==="function") rslt = test(event,model);
					if(rslt || (state && new RegExp(key).test(state))) {
						target.id || (target.id = (Math.random()+"").substring(2));
						event.type==="popstate" || rslt || history.pushState({href:target.href,view:target.id},cntrlr[key].title||state);
						const view = (cntrlr[key].selector ? document.querySelector(cntrlr[key].selector) : target);
						if(typeof(cntrlr[key].sideffect)==="function") cntrlr[key].sideffect(event,view,model);
						return cntrlr[key].cascade;
					}
					return true;
				});
				event.preventDefault();
				event.stopPropagation();
				!next || next();
			}
	}
	const Fete = {
			activate: F.actvt,
			bind: F.bnd,
			imports: F.imprts
		};
	if(typeof(module)!=="undefined") {
		module.export = Fete;
	} else if(typeof(this)!=="undefined"){
		this.Fete = Fete;
	} else {
		window.Fete = Fete;
	}
}).call(this);