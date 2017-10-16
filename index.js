(function() {
	"use strict"
	let NODE;
	const ACTIVE = new Map();
	class ObjectEvent {
		constructor(config) {
			Object.assign(this,config);
			Object.defineProperty(this,"timeStamp",{enumerable:true,configurable:true,writable:false,value:Date.now()});
		}
		stopPropogation() {
			this.stop = true;
		}
	}
	const activate = (value,node) => {
			if(value && typeof(value)==="object" && !ACTIVE.get(value)) {
				const dependents = {nodes:new Set(),observers:new Map()};
				ACTIVE.set(value,dependents);
				!Array.isArray(value) || (NODE = node);
				for(let key in value) activateProperty(value,key,activate(value[key],node),dependents);
				if(Array.isArray(value)) {
					activateProperty(value,"length",activate(value.length),dependents);
					for(let i=0;i<value.length;i++) {
						value[i] = activate(value[i]);
						activateProperty(value,i,value[i],node,dependents);
					}
					value = new Proxy(value,{
						set: (target,property,value) => {
							if(property!=="length") {
								activateProperty(target,property,null,null,dependents);
								for(let node of dependents.nodes) {
									if(node.fDpndts) {
										let properties = node.fDpndts.get(target);
										properties || (node.fDpndts.set(target,properties={}));
										properties[property] = true;
									}
								}
							}
							target[property] = value;
							return true;
						}
					});
				}
				NODE = null;
			}
			return value;
		},
		activateProperty = (target,property,value,node,activated = ACTIVE.get(target)) => {
			 function get() {
					addDependents(this);
					let value =  desc.get.value;
					if(observers.size>0) {
						let phase = "beforeGet",
						event = new ObjectEvent({type:phase,target,property});
						for(let [observer,accept] of observers) { if(accept.includes(phase)) { observer(event); } if(event.stop) return; }
						phase = "get";
						event = new ObjectEvent(event);
						event.type = phase;
						event.value = value;
						for(let [observer,accept] of observers) { if(accept.includes(phase)) { observer(event); } if(event.stop) return; }
						phase = "afterGet";
						value = event.value;
						event = new ObjectEvent(event);
						event.type = phase;
						for(let [observer,accept] of observers) { if(accept.includes(phase)) { setTimeout(() => observer(event)); } }
					}
					return value;
				};
			const addDependents = (scope) => {
					if(NODE) {
						let properties;
						NODE.fDpndts || (NODE.fDpndts = new Map());
						properties = NODE.fDpndts.get(scope);
						properties || (NODE.fDpndts.set(scope,properties = {}));
						properties[property] = true;
						activated.nodes.add(NODE);
					}
				};
			let desc = Object.getOwnPropertyDescriptor(target,property);
			const type = (desc ? typeof(desc.value) : "undefined");
			if(type==="function") return;
			if(typeof(value)==="undefined" && desc) value = desc.value;
			activated || ACTIVE.set(target,activated={nodes:new Set(),observers:new Set()});
			const olddesc = desc,
				nodes = activated.nodes,
				observers = activated.observers;
			let event = new ObjectEvent({type:"beforeAdd",target,property,value});
			if(!olddesc) {
				for(let [observer,accept] of observers) { if(accept.includes("beforeAdd")) { observer(event); } if(event.stop) return; }
			}
			addDependents(target);
			desc || (desc = {enumerable:true,configurable:true,writable:true});
			if(!desc.configurable) return;
			if(event.value && type==="target") desc.value = activate(event.value,node);
			const oldget = desc.get;
			desc.get+""===get+"" || (desc.get = get);
			desc.get.value = (typeof(event.value)!=="undefined" ? event.value : oldget);
			const oldset = desc.set;
			desc.set = function set(value) {
				value = activate(value);
				const oldvalue = desc.get.value,
					oldtype = typeof(oldvalue);
				if(oldvalue!==value || (oldtype==="undefined" && typeof(value)==="undefined")) {
					if(observers.size>0) {
						let phase = "beforeChange",
						event = new ObjectEvent({type:phase,target,property,value});
						for(let [observer,accept] of observers) { if(accept.includes(phase)) { observer(event); } if(event.stop) return; }
						value = event.value;
					}
					for(let node of nodes) {
						if(node.parentElement || node.ownerElement) {
							const properties = node.fDpndts.get(this);
							if(properties && properties[property]) schedule(node);
						} else nodes.delete(node);
					}
					if(oldset) oldset(value); 
					else desc.get.value = value;
					if(observers.size>0) {
						let phase = "afterChange";
						event = new ObjectEvent({type:phase,target,property,oldvalue});
						for(let [observer,accept] of observers) { if(accept.includes(phase)) { setTimeout(() => observer(event)) } }
					}
				}
				return true;
			}
			delete desc.writable;
			delete desc.value;
			Object.defineProperty(target,property,desc);
			if(!olddesc) {
				for(let [observer,accept] of activated.observers) { if(accept.includes("afterAdd")) { observer(new ObjectEvent({type:"afterAdd",target,property,value})); } }
			} 
		},
		compileAux = function(root,elements) {
			for(let child of [].slice.call(this.children)) compileAux.call(child,root,elements);
			for(let attribute of [].slice.call(this.attributes)) {
				if(attribute.name.indexOf("on")===0 && root[attribute.value]) {
					this.removeAttribute(attribute.name);
					this[attribute.name] =  root[attribute.value].bind(root);
				}
			}
			if(this.tagName==="F-ELEMENT") this.parentElement.replaceChild(elements[parseInt(this.innerText)],this);
		},
		extensions = {
			
		},
		elements = {
				
		},
		directives = {
				
		},
		fetish = node => {
			const ctor = elements[node.tagName];
			!ctor || Object.setPrototypeOf(node,ctor.prototype);
				!node.connectedCallback || node.connectedCallback();
		},
		onchange = event => {
			const target = event.target;
			if(target.type==="checkbox") {
				syncCheckbox(target,Fete.parse(target.value));
			} else {
				let value = parse(target.value);
				const attr = (target.type==="radio" ? target.getAttributeNode("checked") : target.getAttributeNode("value"));
				if(target.type==="select-multiple") {
					const selected = [].slice.call(target.selectedOptions);
					let values = attr;
					if(!values) {
						target.setAttribute("value","[]");
						values = target.getAttributeNode("value");
					}
					values.feteData.splice(0,values.feteData.length,...selected.map(option => Fete.parse(option.value)));
					target.setAttribute("value",JSON.stringify(values.feteData));
					value = values.feteData;
				}
				target.getAttribute("f-reactive")==false || updateModel(attr,value);
			}
		},
		oncbclick = event => {
			const target = event.target;
			syncCheckbox(target,target.checked);
			target.getAttribute("f-reactive")==false || updateModel(target.getAttributeNode("value")||target.getAttributeNode("checked"),target.checked);
		},
		parse = function(value) {
			if(typeof(value)==="string") {
				try {
					let result;
					if(value.indexOf("${")>=0) {
						result = Function("parser","return parser.bind(this)`" + value + "`").call(this,parser);
					} else if(value.trim().indexOf("function")==="0" || value.indexOf("=>")>0){
						const f = Function("return " + value).call(this);
						typeof(f)!=="function" || (result = f);
					} else {
						result = JSON.parse(value);
					}
					typeof(result)==="undefined" || (value = result);
				} catch(e) {
					;
				}
			}
			return value;
		},
		parser = function(strings,...values) {
			if(values.length===1 && strings.filter(item => item.length>0).length===0) return values[0];
			let result = "";
			for(let i=0;i<strings.length;i++) result += (strings[i] + (i<values.length ? values[i] : ""));
			return result;
		},
		propertyName = template => {
			if(typeof(template)==="string" && template[template.length-1]==="}" && template.indexOf("${")===0) {
				const property = template.substring(2,template.length-1);
				if(/^(?:[\w]+\.)*\w+$/.test(property)) return property;
			}
		},
		resolve = function(template,node) {
		// n=node,m=model,p=property,e=extras
			const code = 
`const model=n.feteModel||{};
 do{
  try {
   with(e){with(model){return $.parser__template__;}}
  }catch(err){
   if(err instanceof ReferenceError){
    const p=err.message.split(" ")[0];
     let prnt=n.parentElement||n.ownerElement,v;
      while(prnt){
       let m = prnt.feteModel;
       if(m && typeof(m)==="object" && p in m){v=m[p];break;}
       prnt=prnt.parentElement;
	  }
      if(typeof(v)==="undefined") return; 
	  else e[p]=v;
   }else throw(err);
  }
 }while(true)`.replace(/__template__/g,"`"+template+"`");
			NODE = ((node instanceof HTMLElement || node instanceof Text || node instanceof Attr) && node.rRndr ? node : null);
			const extrs = {};
			if(NODE && node.attributes) {
				const attributes = [].slice.call(node.attributes);
				for(let attribute of attributes) extrs[attribute.name] = (typeof(attribute.feteData)!=="undefined" ? attribute.feteData : attribute.value);
			}
			let value = new Function("n","$","e",code).call(this,node,extensions,extrs);
			NODE = null;
			return value;
		},
		router = (event,next) => {
			const target = event.currentTarget,
				controller = target.fCtrlr;
			if(controller) {
				const controllertype = typeof(controller),
					model = target.feteModel || {};
				if(controllertype==="function") controller(event,target.feteModel);
				else if(controllertype==="object") {
					let some;
					if(Object.keys(controller).every(key => {
						let state, 
							rslt = false;
						const test = controller[key].test,
							view = (controller[key].selector ? document.querySelector(controller[key].selector) : target);
						if(event.target.hash) state = event.target.hash.substring(1);
						else if(typeof(test)==="function") rslt = test(event,view,model,state);
						if(rslt || (state && new RegExp(key).test(state))) {
							event.type==="popstate" || rslt || history.pushState({href:target.href,view:target.id},controller[key].title||state);
							if(typeof(controller[key].sideffect)==="function") controller[key].sideffect(event,view,model);
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
		schedule = node => {
			const app =document.getElementById("app"); // should not have to do this
			if(app!==node && (node.parentElement || node.ownerElement)) { //(node.parentElement || node.ownerElement) && document.body.contains(node) && 
				!(node instanceof Attr) || (node = node.ownerElement);
				node.fDrty = true;
				setTimeout(() => Fete.render(node));
			}
		},
		syncCheckbox = (target,value) => {
			target.value!=value || (target.value = value);
			target.checked!=value || (target.checked = value);
			if(!target.hasAttribute("checked")) target.setAttribute("checked","");
		},
		updateModel = (node,value) => {
			const template = (node && node.rRndr ? node.rRndr.template : null),
				model = node.feteModel;
			if(template && model) {
				const property = propertyName(template);
				!property || (model[property] = value);
			}
		},
		renderAttr = function(model) {
			const value = this.value;
			if(!this.rRndr && (value.indexOf("${")>=0 || this.name.indexOf("f-")===0 || value.trim().indexOf("function")===0 || value.indexOf("=>")>=1)) {
				this.rRndr = function rRndr(model) {
					if(this.fDrty===false) return;
					this.fDrty = false;
					Fete.use(this,model);
					const value = parse(resolve.call(this,rRndr.template,this)),
						type = typeof(value);
					this.feteData = value;
					if(this.name==="value") this.ownerElement.value = value;
					else if(this.name.indexOf("on")===0 && type==="function") {
						this.ownerElement[this.name] = value;
					} else if(this.name.indexOf("f-")===-1){
						this.value = (type==="object" && value ? JSON.stringify(value) : value);
					}
				}
				this.rRndr.template = this.value;
				this.fDrty = true;
			}
			!this.rRndr || this.rRndr(model);
		},
		renderElement = function(model,controller) {
			!this.connectedCallback || (this.connected && this.connected()) || this.connectedCallback();
			let local, foreach;
			const modelnode = this.getAttributeNode("f-model"); 
			if(modelnode) {
				const currentmodel = this.feteModel;// || Fete.use(this,model,controller); //this.feteModel; //
				if(!currentmodel) {
					Fete.render(modelnode,model,controller);
					model = Fete.use(this,modelnode.feteData,controller);
				} else {
					model = currentmodel;
				}
			} else {
				model = Fete.use(this,model,controller);
			}
			const letnode = this.getAttributeNode("f-let");
			if(letnode) {
				Fete.render(letnode,model,controller);
				local = letnode.feteData;
			}
			const ifnode = this.getAttributeNode("f-if");
			if(ifnode) {
				Fete.render(ifnode,model,controller);
				if(!ifnode.feteData) return;
			}
			for(let name in directives) {
				const attribute = this.getAttributeNode(name);
				!attribute || document.directives[name](model,this,attribute);
			}
			const attributes = [].slice.call(this.attributes);
			for(let attribute of attributes) {
				const name = attribute.name;
				if(!["f-model","f-let","f-if"].includes(name) && !directives[name]) {
					Fete.render(attribute,model,controller);
					if(name==="f-foreach") foreach = attribute.feteData;
				}
			}
			const children = [].slice.call(this.childNodes);
			if(foreach) {
				if(!this.rRndr) {
					this.rRndr = function(model,controller) {
						while(this.lastChild) {
							const node = this.lastChild;
							if(node.fDpndts) {
								for(let [value,target] of node.fDpndts) {
									const activated = ACTIVE.get(target);
									if(activated) activated.nodes.delete(node);
								}
								node.fDpndts.clear();
							}
							this.removeChild(this.lastChild);
						}
						const isarray = Array.isArray(foreach),
							models = (isarray ? foreach : Object.values(foreach)),
							keys = (isarray ? [] : Object.keys(foreach));
						for(let i=0;i<models.length;i++) {
							const model = {key:(isarray ? i : keys[i]),value:models[i]};
							for(let child of children) {
								const clone = child.cloneNode(true);
								this.appendChild(clone);
								Fete.render(clone,(model ? Object.assign(model,local) : local),controller);
							}
						}
					}
				}
				this.rRndr(model,controller);
			} else {
				for(let child of children) child instanceof Attr || Fete.render(child,model ? Object.assign(model,local) : local,controller);
			}
			if(this.type==="checkbox") {
				syncCheckbox(this,this.checked || Fete.parse(this.value));
			} else if(this.type==="select-multiple" && this.multiple) {
				const values = this.getAttributeNode("value");
				if(values) {
					for(let option of [].slice.call(this.options)) {
						if(values.feteData.includes(Fete.parse(option.value))) option.selected = true;
					}
				}
			}
			if(this instanceof HTMLInputElement || this instanceof HTMLSelectElement) {
				this.addEventListener("change",onchange);
				if(this.type==="checkbox") this.addEventListener("click",oncbclick);
			}
		},
		renderText = function(model) {
			if(!this.rRndr && this.textContent.indexOf("${")>=0) {
				this.rRndr = function rRndr(model) {
					if(this.fDrty===false) return;
					this.fDrty = false;
					Fete.use(this,model);
					let value = parse(resolve.call({},rRndr.template,this)),
						type = typeof(value);
					value = (type==="string" ? value : (type==="function" ? value+"" : JSON.stringify(value)));
					this.textContent = value;
				}
				this.rRndr.template = this.textContent;
				this.fDrty = true;
			}
			!this.rRndr || this.rRndr(model);
		},
		Fete = {
			compile(strings,...values) {
				if(values.length===1 && strings.filter(item => item.length>0).length===0) return values[0];
				const elements = [];
				let result = "";
				for(let i=0;i<strings.length;i++) {
					const type = typeof(values[i]);
					let value = values[i];
					if(type==="function") value = values[i].name;
					else if(value && type==="object" && value instanceof HTMLElement) {
						value = "<f-element>" + elements.length + "</f-element>";
						elements.push(values[i]);
					}
					result += (strings[i] + (i<values.length ? value : ""));
				}
				const element = document.createElement("unknown");
				element.innerHTML = result;
				const children = [].slice.call(element.children);
				for(let child of children) compileAux.call(child,this,elements);
				while(this.lastChild) this.removeChild(this.lastChild);
				if(children.length===1) {
					result = element.children[0];
					this.appendChild(element.children[0])
				} else {
					const span = document.createElement("span");
					while(element.firstChild) span.appendChild(element.firstChild);
					this.appendChild(span);
					result = span;
				}
				return result;
			},
			h(tagName,attributes={},innerHTML) {
				const node = document.createElement(tagName);
				for(let attribute in attributes) {
					const value = attributes[attribute],
						type = typeof(value);
					if(type==="function") node[attribute] = value;
					else node.setAttribute(attribute,attributes[attribute]);
				}
				!innerHTML || (node.innerHTML = innerHTML);
				return node;
			},
			initialize(element=document.body) {
				if(extensions.parser && this.documentObserver) return;
				Fete.registerExtension("parser",parser);
				Fete.registerExtension("activateProperty",activateProperty);
				this.documentObserver = new MutationObserver(function(mutations) {
					mutations.forEach(function(mutation) {
				    	if(mutation.type==="attributes") {
				    		!mutation.target.attributeChangedCallback || mutation.target.attributeChangedCallback(mutation.attributeName,mutation.oldValue,mutation.target.getAttribute(mutation.attributeName));
				    	} else if(mutation.type==="childList") {
				    		const nodes = [].slice.call(mutation.addedNodes);
				    		for(let node of nodes) fetish(node);
				    	}
				  	});    
				});
				this.documentObserver.observe(element,{attributes:true,childList:true,attributeOldValue:true,subtree:true});
				for(let child of [].slice.call(element.childNodes)) {
					fetish(child);
					Fete.render(child);
				}
			},
			mvc(model,view,controller,options) {
				typeof(view)!=="string" || (view = document.querySelector(view));
				Fete.use(view,model,controller);
				this.initialize();
				Fete.render(view,model,controller);
				return model;
			},
			observe(target,callback,acceptList=["beforeGet","get","afterGet","beforeChange","afterChange","beforeAdd","afterAdd"]) {
				ACTIVE.get(activate(target)).observers.set(callback,acceptList);
			},
			parse(value) {
				return parse.call(this,value);
			},			
			registerDirective(name,callback) {
				directives[name] = callback;
			},
			registerExtension(name,f) {
				extensions[name] = f;
			},
			render(node,model,controller) {
				if(node instanceof Attr) renderAttr.bind(node)(model,controller);
				else if(node instanceof HTMLElement) renderElement.bind(node)(model,controller);
				else if(node instanceof Text) renderText.bind(node)(model,controller);
			},
			styled(tagNameOrCtor) {
				return (strings,...values) => {
					let style = "";
					for(let i=0;i<strings.length;i++) style += (strings[i] + (i<values.length ? values[i] : ""));
					style = style.replace(/\n/g,"");
					const styling = {},
						styled = document.createElement("span");
					styled.style = style;
					for(let i=0;i<styled.style.length;i++) {
						styling[styled.style[i]] = styled.style[styled.style[i]];
					}
					return function(attributes,innerHTML="") {
						const type = typeof(tagNameOrCtor),
							ctor = (type==="string" ? elements[tagNameOrCtor.toUpperCase()] : (type==="function" ? tagNameOrCtor : null)),
							el = (ctor ? (ctor.create ? ctor.create(attributes) : new ctor(attributes)) : document.createElement(tagNameOrCtor));
						attributes || (attributes = {});
						for(let name in styling) el.style[name] = styling[name];
						for(let name in attributes) {
							const value = attributes[name];
							if(typeof(name)==="function") el[name] = value;
							else el.setAttribute(name,value);
						}
						el.innerHTML = innerHTML;
						return el;
					}
				}
			},
			unobserve(target,callback) {
				const activated = ACTIVE.get(target);
				!activated || activated.observers.delete(callback);
			},
			update(node,value) {
				updateModel(node,value);
			},
			use(node,model,controller) {
				if(model) model = node.feteModel = activate(model,node);
				if(controller) {
					this.fCtrlr = (typeof(controller)==="string" ? controller = new Function("return " + controller)() : controller);
					const element = (node instanceof Text ? node.parentElement : (node instanceof Attr ? node.ownerElement : node));
					element.addEventListener("click",(event) => controller(event,model));
					element.addEventListener("change",(event) => controller(event,model));
				}
				return node.feteModel;
			}
		};
	class Component extends HTMLElement {
		attributeChangedCallback(attributeName, oldValue, newValue, namespace) {
			if(typeof(this[attributeName])!=="undefined" && this[attributeName]!==newValue) this[attributeName]=newValue;
		}
		connected() { 
			return this.children.length>0;
		}
		connectedCallback() {
			const attributes = [].slice.call(this.attributes);
			for(let attribute of attributes) {
				attribute.name.indexOf("f-")===0 || this.childNodes.length!==1 || this.firstChild!==this.childNodes[0] || this.firstChild.setAttribute(attribute.name,attribute.value);
			}
		}
	}
	Fete.Component = Component;
	const register = document.registerElement;
	document.registerElement = function(name,cls) {
		document.addEventListener("load",Fete.initialize);
		elements[name.toUpperCase()] = cls;
		if(register) register.call(document,name,cls);
		else document.createElement(name);
		cls.create = (attributes) => {
			const element = document.createElement(name);
			for(let attrname in attributes) {
				element.setAttribute(attrname,attributes[attrname]);
			}
			return element;
		}
	}
	if(typeof(module)!=="undefined") module.exports = Fete;
	if(typeof(window)!=="undefined") window.Fete = Fete;
}).call(this);
