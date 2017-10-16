(function() {
	class FeteTimer extends Fete.Component {
		connectedCallback() {
			const onclick = this.dispatch.bind(this);
			this.minuteLabel = Fete.h("label",null,"Min ");
			this.secondLabel = Fete.h("label",null,"Sec ");
			this.millisecondLabel = Fete.h("label",null,"Msec ");
			this.minuteValue = Fete.h("label",null,"${minutes}");
			this.secondValue = Fete.h("label",null,"${(seconds+'').padStart(2,'0')}");
			this.millisecondValue = Fete.h("label",null,"${(milliseconds+'').padStart(3,'0')}");
			this.startButton = Fete.h("input",{type:"button",value:"Start",onclick});
			this.stopButton = Fete.h("input",{type:"button",value:"Stop",onclick});
			this.resetButton = Fete.h("input",{type:"button",value:"Reset",onclick});
			Fete.compile.bind(this)`<table><thead><tr><td>${this.minuteLabel}</td><td>${this.secondLabel}</td><td>${this.millisecondLabel}</td></tr></thead>
				<tbody><tr><td>${this.minuteValue}</td><td>${this.secondValue}</td><td>${this.millisecondValue}</td></tr></tbody>
				<tfoot><tr><td>${this.startButton}</td><td>${this.stopButton}</td><td>${this.resetButton}</td></tr></tfoot></table>`;
			super.connectedCallback();
			let offset = 0;
			if(this.hasAttribute("minutes")) offset += Fete.parse(this.getAttribute("minutes")) * 60 * 1000; 
			if(this.hasAttribute("seconds")) offset += Fete.parse(this.getAttribute("seconds")) * 1000;
			if(this.hasAttribute("milliseconds")) offset += Fete.parse(this.getAttribute("milliseconds"));
			this.model = Fete.use(this,{pause:0,running:0,minutes:0,seconds:0,milliseconds:0,started:0,offset});
			if(this.hasAttribute("running")) this.start();
		}
		dispatch(event) {
			const command = (event.target.value ? event.target.value.toLowerCase() : null);
			!command || !this[command] || this[command]();
		}
		reset() {
			const model = this.model;
			model.offset = 0;
			model.running = 0;
			model.minutes = 0;
			model.seconds = 0;
			model.milliseconds = 0;
			model.started = 0;
			if(model.pause==0) {
				model.pause = -1;
				this.start();
			} else {
				model.pause = -1;
			}
		}
		start() {
			const me = this,
				model = this.model
			model.started || (model.started = model.started + (Date.now() - model.pause)); // bump effective start time due to pause
			model.pause = 0;
			setTimeout(() => { me.tick(); });
		}
		stop() {
			const model = this.model;
			model.pause!==0 || (model.pause = Date.now());
		}
		tick() {
			const model = this.model;
			if(!model.pause) {
				const me = this;
				model.running = (Date.now() - model.started) + model.offset;
				model.minutes = Math.trunc(model.running / (60 *1000));
				model.seconds = Math.trunc((model.running - (model.minutes * 60 * 1000)) / 1000);
				model.milliseconds = Math.trunc((model.running - (model.minutes * 60 * 1000)) -  (model.seconds * 1000));
				setTimeout(() => { me.tick(); },10)
			}
		}
	}
	document.registerElement("f-timer",FeteTimer);
	window.FeteTimer = FeteTimer;
})();