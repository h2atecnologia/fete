(function() {
	class FeteEditor extends HTMLElement {
		validate(event) {
			const value = Fete.parse(event.target.value),
				title = this.getAttribute("title"),
				options = this.options || this._options;
			if(options) {
				const choices = [].slice.call(options);
				if(!choices.some(option => option===value || Fete.parse(option.value)===value)) {
					event.target.setCustomValidity("Must be one of: " + JSON.stringify(options));
				} else {
					event.target.setCustomValidity("");
				}
			}
			if(event.target.validationMessage) {
				event.target.setAttribute("title",event.target.validationMessage);
			} else {
				event.target.setAttribute("title",title||"");
				this.value = value;
				Fete.update(event.target,value);
			}
		}
		update(event) {
			let value = Fete.parse(event.target.value);
			if(event.target.type==="select-multiple") {
				value = [];
				for(let option of [].slice.call(event.target.selectedOptions)) value.push(Fete.parse(option.value));
			}
			this.value = value;
			Fete.update(event.target,value);
		}
		connectedCallback() {
			const attributeMap = (element,exclude=["options"]) => {
				const map = {},
					attributes = [].slice.call(element.attributes).filter(attribute => !exclude || !exclude.includes(attribute.name));
				for(let attribute of attributes) {
					const value = Fete.parse(attribute.value);
					if(["checked","hidden","selected","multiple"].includes(attribute.name) && (value || value==="")) map[attribute.name] = true;
					map[attribute.name] = value;
				}
				return map;
			};
			const attributes = attributeMap(this),
				options = this.getAttribute("options");
			let type = this.type = attributes.type || "text";
			type!=="string" || (type = "text");
			this.label = attributes.label;
			let element;
			!options || (this._options = Fete.parse(options));
			if(["text","number","date","color","file","email","password","tel","url","radio"].includes(type)) { //Fete.compile.bind(this)
				Fete.compile.bind(this)`${(this.label ? (`<label>${this.label}</label>`) : "")}
				    <input type="${type}" style="invalid:{border-color:red;}" onchange="${this.validate}" 
					${Object.keys(attributes).map(key => " " + key + "='" + attributes[key] + "'").join("")}
				    >
				`;
			} else if(type==="radiogroup") {
				const me = this,
					options = Fete.parse(this.getAttribute("options")),
					name =  this.getAttribute("name") || Math.random();
				Fete.compile.bind(this)`${(this.label ? (`<label>${this.label}</label>`) : "")}
					<span>
						${options.map(option => {
								if(typeof(option)==="object") {
									const value = option.value,
										label = option.label;
									return (`<input type="radio" name="${name}" value="${value}" onclick="update">${label}`);
								}
						 }).join("")
					 }
					<span>`;
			} else if(type==="select-one") {
				const options =  Fete.parse(this.getAttribute("options")),
					valuenode = this.getAttributeNode("value"),
					value = (valuenode && valuenode.feteData ? valuenode.feteData : Fete.parse(this.getAttribute("value")));
				Fete.compile.bind(this)`${(this.label ? (`<label>${this.label}</label>`) : "")}
					<select onchange="${this.update}">
						${options.map(option => {
							const ovalue = (typeof(option.value)!=="undefined" ? Fete.parse(option.value) : option.label || option.text || option),
							label = option.label || option.text || (typeof(option.value)!=="undefined" ? option.value : option);
							return (`<option ${value===ovalue ? " selected" : ""}>${label}</option>`);
						}).join("")
					}
					</select>`;
			} else if(type==="select-multiple") {
				const options =  Fete.parse(this.getAttribute("options")),
					valuenode = this.getAttributeNode("value"),
					values = (valuenode && valuenode.feteData ? valuenode.feteData : Fete.parse(this.getAttribute("value")) || []);
				Fete.compile.bind(this)`${(this.label ? (`<label>${this.label}</label>`) : "")}
					<select onchange="${this.update}" multiple>
						${options.map(option => {
							const value = (typeof(option.value)!=="undefined" ? Fete.parse(option.value) : option.label || option.text || option),
							label = option.label || option.text || (typeof(option.value)!=="undefined" ? option.value : option);
							return (`<option ${values.includes(value) ? " selected" : ""}>${label}</option>`);
						}).join("")
					}
					</select>`;
			}
		}
	}
	document.registerElement("f-editor",FeteEditor);
	window.FeteEditor = FeteEditor;
})();