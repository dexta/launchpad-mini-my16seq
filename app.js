const midiOut = require('./midi');
const Launchpad = require( 'launchpad-mini' );
const pad = new Launchpad();

const MAX_COL = 7;
const MAX_ROW = 7;
const CONTROL_COL = 8;

let BTN_GRID = [];
let SEQ_PATT = [];

let MIDI_OUT = null;
let MIDI_NOTE = [36,40,37,42];
let SEQ_TEST = [
	[true,false,false,false,true,false,false,false,true,false,false,false,true,true,false,false],
	[false,false,true,false,false,false,true,false,false,false,true,false,false,true,true,false],
	[false,false,true,false,false,false,true,false,false,false,true,false,false,false,true,false],
	[true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true]
];

// console.dir(Launchpad.Buttons.Grid);

pad.connect().then( () => {
	let args = {
		write: 0,               // Write buffer (0 or 1)
    display: 1,             // Display buffer (0 or 1)
    copyToDisplay: true,   // Copy write to display
    flash: false            // Enable flashing
	};

	pad.setBuffers( args );
	pad.reset(3);
	addPATT(4);
	// SEQ_PATT[0].SEQ[1] = true; SEQ_PATT[0].SEQ[5] = true;
	init(pad);
});

const init = (pad) => {
	MIDI_OUT = midiOut.connect('Hydrogen');
	for(let y=0; y <= MAX_COL; y++) {
		BTN_GRID[y] = [];
		for(let x=0; x <= MAX_ROW; x++) {
			BTN_GRID[y][x] = pad.yellow;
			pad.col( pad.yellow, [y,x]);
		}
	}
	
	// console.dir(BTN_GRID);
	pad.on( 'key', k => {
		if(k.pressed) {
			pad.col( pad.red.full, k);
			return;
		}
		if(k.y === CONTROL_COL || k.x === CONTROL_COL) {
			if(k.x===0 && k.y===8) {
				console.log(`You pressed a control key`);
				console.log('pattern Upper');
			} else if(k.x===1 && k.y===8) {
				console.log('pattern Downer');
			}
			pad.col( pad.yellow.full, k);
		} else {
			console.log(`pressed: ${k.pressed} Y:${k.y} X:${k.x}`);
			let btnStatus = BTN_GRID[k.x][k.y];
			if(!btnStatus||false) return;
			if(btnStatus._name==='green') {
				BTN_GRID[k.x][k.y] = pad.yellow;
				updatePatts(false,k.x,k.y);
			} else if(btnStatus._name==='yellow') {
				BTN_GRID[k.x][k.y] = pad.green;
				updatePatts(true,k.x,k.y);
			}
			pad.col( BTN_GRID[k.x][k.y], k);
		}
	});
	seq_to_pad(pad);
	sequencer(pad);
};

const addPATT = (num,pad) => {
	count = (num||false)? parseInt(num) : 1;
	for(let p=0; p < count; p++) { 
		let nPatt = {
			MAX:15,
			POS:0,
			BPM: 90,
			NOTE: '#F',
			SEQ: SEQ_TEST[p]
		};

		nPatt.SEQ = Array(nPatt.MAX+1).fill(false);
		// console.dir(nPatt);
		SEQ_PATT.push(nPatt);
	}
};

const updatePatts = (status, x, y) => {
	let pattInx = Math.floor(y/2);
	let pattPos = (y%2===0)? x : x + 8;
	if(SEQ_PATT[pattInx]||false) {
		SEQ_PATT[pattInx].SEQ[pattPos] = status;
	}
};

const updatePad = (pad) => {
	for(let y=0; y <= MAX_COL; y++) {
		for(let x=0; x <= MAX_ROW; x++) {
			pad.col( BTN_GRID[y][x], [y,x]);
		}
	}
};

const seq_to_pad = (pad) => {
	for(let y=0; y <= MAX_COL; y++) {
		for(let x=0; x <= MAX_ROW; x++) {
			let pattInx = Math.floor(y/2);
			let pattPos = (y%2===0)? x : x +8;
			if(SEQ_PATT[pattInx].SEQ[pattPos]||false) {
				BTN_GRID[x][y] = pad.green;
			}
		}
	}
	updatePad(pad);
};

const sequencer = (pad) => {
	updatePad(pad);
	let midiMSG = [];
	for(let s in SEQ_PATT) {
		let bp = {x:0,y:0};
		if(SEQ_PATT[s].POS>7) {
			bp.y = SEQ_PATT[s].POS-8;
			bp.x = (s*2)+1;
		} else {
			bp.y = SEQ_PATT[s].POS;
			bp.x = (s*2);
		}
		// console.log(`pInx: ${s} pos: ${SEQ_PATT[s].POS} noteOn: ${SEQ_PATT[s].SEQ[SEQ_PATT[s].POS]}`);
		if(SEQ_PATT[s].SEQ[SEQ_PATT[s].POS]) {
			// let msg = newMessage(3, 142, true);
			midiMSG.push([145,MIDI_NOTE[s],127]);
			// MIDI_OUT.sendMessage(msg);
			// console.log(`Play Node [Chanel, Note, on] => ${msg}`);
			// nCount++;
		}
		pad.col( pad.red, [bp.y, bp.x]);
		SEQ_PATT[s].POS++;
		if(SEQ_PATT[s].POS>SEQ_PATT[s].MAX) SEQ_PATT[s].POS = 0;		
	}
	if(midiMSG.length>0) {
		console.log(midiMSG);
		for(let m in midiMSG) {
			MIDI_OUT.sendMessage(midiMSG[m]);
		}
	}
	setTimeout( () => { sequencer(pad); } , (60000/120) );
};

const newMessage = (channel, note, on) => {
  const velocity = on ? 127 : 0;
  const status = (on ? 144 : 128) + channel;
  return [ status, note, velocity ];
};

let nCount=0; 