import { vec2 } from "gl-matrix";

// uses keycodes according to
export default class Input{
  private static inner: { 
    checkInitialized: () => boolean;
    mousePosition: vec2; 
    mousePositionDelta: vec2; 
    mouseWheelDelta: number; 
    mouseup: Array<boolean>; 
    mousedown: Array<boolean>; 
    mousehold: Array<boolean>; 
    keysup: Array<boolean>; 
    keyMapping: Map<string, number>; 
    keysdown: Array<boolean>; 
    keyshold: Array<boolean>; 
    update: () => void; 
    keysdownBuffer: Array<boolean>; 
    keysupBuffer: Array<boolean>; 
    mousedownBuffer: Array<boolean>; 
    mouseupBuffer: Array<boolean>; 
    mouseWheelDeltaBuffer: number; 
    mousePositionDeltaBuffer: vec2; 
    offsetX: number; 
    offsetY: number; 
  }
  static isInitialized: any;
  
/**
  * The current position of the mouse in screen coordinates of the canvas.
  * @return {vec2} the current position of the mouse.
  */
  static get mousePosition(){
      if(!Input.inner.checkInitialized()) return undefined;
      return Input.inner.mousePosition;
  }

  /**
  * The movement of the mouse from last frame to this frame in screen coordinates of the canvas.
  * @return {vec2} the current movement of the mouse.
  */
  static get mousePositionDelta(){
      if(!Input.inner.checkInitialized()) return undefined;
      return Input.inner.mousePositionDelta;
  }

  /**
  * Movement of the mouse scroll wheel in a range of -1 to 1;
  * @return {number} the value of the scroll wheel this frame.
  */
  static get mouseWheelDelta(){
      if(!Input.inner.checkInitialized()) return undefined;
      return Input.inner.mouseWheelDelta || 0;
  }

  /**
  * Returns true when the given mouse button was released this frame.
  * @param {string | number} button the button to use for the lookup: 0 or "left", 1 or "middle", 2 or "right"
  * @return {boolean} whether the button was released this frame.
  */
  static mouseButtonReleased(button: string | number){
      if(!Input.inner.checkInitialized()) return undefined;
      if(!button){
          return Input.inner.mouseup[0] || Input.inner.mouseup[1] || Input.inner.mouseup[2];
      }
      let convertedButton: number;
      if(typeof button === 'string' || (button as any) instanceof String){
          if(button === "left") convertedButton = 0;
          if(button === "middle") convertedButton = 1;
          if(button === "right") convertedButton = 2;
      } else {
        convertedButton = button as number;
      }
      return(Input.inner.mouseup[convertedButton]);
  }

  /**
  * Returns true when the given mouse button was pressed down this frame.
  * @param {string | number} button the button to use for the lookup: 0 or "left", 1 or "middle", 2 or "right"
  * @return {boolean} whether the button was pressed down this frame.
  */
  static mouseButtonDown(button: string | number){
      if(!Input.inner.checkInitialized()) return undefined;
      if(!button){
          return Input.inner.mousedown[0] || Input.inner.mousedown[1] || Input.inner.mousedown[2];
      }
      let convertedButton: number;
      if(typeof button === 'string' || (button as any) instanceof String){
          if(button === "left") convertedButton = 0;
          if(button === "middle") convertedButton = 1;
          if(button === "right") convertedButton = 2;
      } else {
        convertedButton = button as number;
      }
      return(Input.inner.mousedown[convertedButton]);
  }

  /**
  * Returns true when the given mouse button is beeing hold down this frame.
  * @param {string | number} button the button to use for the lookup: 0 or "left", 1 or "middle", 2 or "right"
  * @return {boolean} whether the button is beeing hold down this frame.
  */
  static mouseButtonHold(button: string | number){
      if(!Input.inner.checkInitialized()) return undefined;
      if(!button){
          return Input.inner.mousehold[0] || Input.inner.mousehold[1] || Input.inner.mousehold[2];
      }
      let convertedButton: number;
      if(typeof button === 'string' || (button as any) instanceof String){
          if(button === "left") convertedButton = 0;
          if(button === "middle") convertedButton = 1;
          if(button === "right") convertedButton = 2;
      } else {
        convertedButton = button as number;
      }
      return(Input.inner.mousehold[convertedButton]);
  }

  /**
  * Returns true when the given key was released this frame.
  * @param {string | number} key the key to use for the lookup, see Input.inner.keyMapping for possible values.
  * @return {boolean} whether the key was released this frame.
  */
  static keyReleased(key: string | number){
      if(!Input.inner.checkInitialized()) return undefined;

      if(typeof key === "number"){
          return(Input.inner.keysup[key]);
      }
      let keyL = key.toLowerCase();
      if(Input.inner.keyMapping.has(keyL)){
          return(Input.inner.keysup[Input.inner.keyMapping.get(keyL)]);
      }
      return false;
  }

  /**
  * Returns true when the given key was pushed down this frame.
  * @param {string | number} key the key to use for the lookup, see Input.inner.keyMapping for possible values.
  * @return {boolean} whether the key was pushed down this frame.
  */
  static keyDown(key: string | number){
      if(!Input.inner.checkInitialized()) return undefined;
      if(typeof key === "number"){
          return(Input.inner.keysdown[key]);
      }
      let keyL = key.toLowerCase();
      if(Input.inner.keyMapping.get(keyL) != undefined){
          return(Input.inner.keysdown[Input.inner.keyMapping.get(keyL)]);
      }
      return false;
  }

  /**
  * Returns true when the given key is beeing hold down this frame.
  * @param {string | number} key the key to use for the lookup, see Input.inner.keyMapping for possible values.
  * @return {boolean} whether the key is beeing hold down this frame.
  */
  static keyHold(key: string | number){
      if(!Input.inner.checkInitialized()) return undefined;
      if(typeof key === "number"){
          return(Input.inner.keyshold[key]);
      }
      let keyL = key.toLowerCase();
      if(Input.inner.keyMapping.get(keyL) != undefined){
          return(Input.inner.keyshold[Input.inner.keyMapping.get(keyL)]);
      }
      return false;
  }

  /**
  * Call each fram in oder to update the input system, before checking inputs.
  */
  static update(){
      Input.inner.update();
  }

  /**
   * Call during setup phase to initilaze input system.
   * @param {HTMLCanvasElement} canvas
   */
  static initialize(canvas: HTMLCanvasElement){

    function update(){
      for(let i = 0; i<256; i++){
          Input.inner.keysdown[i] = false;
          Input.inner.keysup[i] = false;
          if(Input.inner.keysdownBuffer[i]){
              Input.inner.keysdown[i] = true;
              Input.inner.keyshold[i] = true;
          }
          if(Input.inner.keysupBuffer[i]){
              Input.inner.keysup[i] = true;
              Input.inner.keyshold[i] = false;
          }
          Input.inner.keysdownBuffer[i] = false;
          Input.inner.keysupBuffer[i] = false;
      }
      for(let i = 0; i<3; i++){
          Input.inner.mousedown[i] = false;
          Input.inner.mouseup[i] = false;
          if(Input.inner.mousedownBuffer[i]){
              Input.inner.mousedown[i] = true;
              Input.inner.mousehold[i] = true;
          }
          if(Input.inner.mouseupBuffer[i]){
              Input.inner.mouseup[i] = true;
              Input.inner.mousehold[i] = false;
          }
          Input.inner.mousedownBuffer[i] = false;
          Input.inner.mouseupBuffer[i] = false;
      }
      Input.inner.mouseWheelDelta = Input.inner.mouseWheelDeltaBuffer;
      Input.inner.mouseWheelDeltaBuffer = 0;
      vec2.set(Input.inner.mousePositionDelta, Input.inner.mousePositionDeltaBuffer[0],
                                         Input.inner.mousePositionDeltaBuffer[1]);
      vec2.set(Input.inner.mousePositionDeltaBuffer,0,0);
    }

    function checkInitialized(){
      if(!Input.isInitialized){
          console.error("Use of Input system without proper initialization, call Input.initialize(gl) during setup.");
          return false;
      }
      return true;
    }

    let box = canvas.getBoundingClientRect();

    Input.inner = {

      checkInitialized: checkInitialized,
      update: update,

      // Keyboard functionality
      keysdown: new Array<boolean>(256).fill(false),
      keysup:   new Array<boolean>(256).fill(false),
      keyshold: new Array<boolean>(256).fill(false),
      keysdownBuffer: new Array<boolean>(256).fill(false),
      keysupBuffer: new Array<boolean>(256).fill(false),

      //Keymapping used by this system, mostly based on old Javascript keyCode mapping.
      // check key table here: https://keycode.info/
      // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
      keyMapping: new Map<string, number>(),

      // Mouse functionality
      mousedown: new Array<boolean>(3).fill(false),      
      mouseup: new Array<boolean>(3).fill(false),        
      mousehold: new Array<boolean>(3).fill(false),        

      mousedownBuffer: new Array<boolean>(3).fill(false),
      mouseupBuffer: new Array<boolean>(3).fill(false),      

      mouseWheelDelta: 0,                                
      mouseWheelDeltaBuffer: 0,                          

      mousePosition: vec2.create(),                      
      mousePositionDelta: vec2.create(),                 
      mousePositionDeltaBuffer: vec2.create(),     
      
      offsetX: box.left,	//Help calc global x,y mouse cords.
      offsetY: box.top,
    } 

    Input.inner.keyMapping.set("backspace",   8);
    Input.inner.keyMapping.set("tab",         9);
    Input.inner.keyMapping.set("enter",       13);
    Input.inner.keyMapping.set("shift",       16);
    Input.inner.keyMapping.set("shiftleft",   16);
    Input.inner.keyMapping.set("shiftright",  16);
    Input.inner.keyMapping.set("ctrl",        17);
    Input.inner.keyMapping.set("ctrlleft",    17);
    Input.inner.keyMapping.set("ctrlright",   17);
    Input.inner.keyMapping.set("control",     17);
    Input.inner.keyMapping.set("controlleft", 17);
    Input.inner.keyMapping.set("controlright",17);
    Input.inner.keyMapping.set("alt",         18);
    Input.inner.keyMapping.set("altleft",     18);
    Input.inner.keyMapping.set("altright",    18);
    Input.inner.keyMapping.set("pause",       19);
    Input.inner.keyMapping.set("break",       19);
    Input.inner.keyMapping.set("capslock",    20);
    Input.inner.keyMapping.set("escape",      27);
    Input.inner.keyMapping.set("space",       32);
    Input.inner.keyMapping.set(" ",           32);
    Input.inner.keyMapping.set("pageup",      33);
    Input.inner.keyMapping.set("pagedown",    34);
    Input.inner.keyMapping.set("end",         35);
    Input.inner.keyMapping.set("home",        36);
    Input.inner.keyMapping.set("arrowleft",   37);
    Input.inner.keyMapping.set("arrowup",     38);
    Input.inner.keyMapping.set("arrowright",  39);
    Input.inner.keyMapping.set("arrowdown",   40);
    Input.inner.keyMapping.set("print",       44);
    Input.inner.keyMapping.set("printscreen", 44);
    Input.inner.keyMapping.set("insert",      45);
    Input.inner.keyMapping.set("delete",      46);
    Input.inner.keyMapping.set("0",    48);
    Input.inner.keyMapping.set("1",    49);
    Input.inner.keyMapping.set("2",    50);
    Input.inner.keyMapping.set("3",    51);
    Input.inner.keyMapping.set("4",    52);
    Input.inner.keyMapping.set("5",    53);
    Input.inner.keyMapping.set("6",    54);
    Input.inner.keyMapping.set("7",    55);
    Input.inner.keyMapping.set("8",    56);
    Input.inner.keyMapping.set("9",    57);
    Input.inner.keyMapping.set("digit0",    48);
    Input.inner.keyMapping.set("digit1",    49);
    Input.inner.keyMapping.set("digit2",    50);
    Input.inner.keyMapping.set("digit3",    51);
    Input.inner.keyMapping.set("digit4",    52);
    Input.inner.keyMapping.set("digit5",    53);
    Input.inner.keyMapping.set("digit6",    54);
    Input.inner.keyMapping.set("digit7",    55);
    Input.inner.keyMapping.set("digit8",    56);
    Input.inner.keyMapping.set("digit9",    57);
    Input.inner.keyMapping.set("a",    65);
    Input.inner.keyMapping.set("b",    66);
    Input.inner.keyMapping.set("c",    67);
    Input.inner.keyMapping.set("d",    68);
    Input.inner.keyMapping.set("e",    69);
    Input.inner.keyMapping.set("f",    70);
    Input.inner.keyMapping.set("g",    71);
    Input.inner.keyMapping.set("h",    72);
    Input.inner.keyMapping.set("i",    73);
    Input.inner.keyMapping.set("j",    74);
    Input.inner.keyMapping.set("k",    75);
    Input.inner.keyMapping.set("l",    76);
    Input.inner.keyMapping.set("m",    77);
    Input.inner.keyMapping.set("n",    78);
    Input.inner.keyMapping.set("o",    79);
    Input.inner.keyMapping.set("p",    80);
    Input.inner.keyMapping.set("q",    81);
    Input.inner.keyMapping.set("r",    82);
    Input.inner.keyMapping.set("s",    83);
    Input.inner.keyMapping.set("t",    84);
    Input.inner.keyMapping.set("u",    85);
    Input.inner.keyMapping.set("v",    86);
    Input.inner.keyMapping.set("w",    87);
    Input.inner.keyMapping.set("x",    88);
    Input.inner.keyMapping.set("y",    89);
    Input.inner.keyMapping.set("z",    90);
    Input.inner.keyMapping.set("keya",    65);
    Input.inner.keyMapping.set("keyb",    66);
    Input.inner.keyMapping.set("keyc",    67);
    Input.inner.keyMapping.set("keyd",    68);
    Input.inner.keyMapping.set("keye",    69);
    Input.inner.keyMapping.set("keyf",    70);
    Input.inner.keyMapping.set("keyg",    71);
    Input.inner.keyMapping.set("keyh",    72);
    Input.inner.keyMapping.set("keyi",    73);
    Input.inner.keyMapping.set("keyj",    74);
    Input.inner.keyMapping.set("keyk",    75);
    Input.inner.keyMapping.set("keyl",    76);
    Input.inner.keyMapping.set("keym",    77);
    Input.inner.keyMapping.set("keyn",    78);
    Input.inner.keyMapping.set("keyo",    79);
    Input.inner.keyMapping.set("keyp",    80);
    Input.inner.keyMapping.set("keyq",    81);
    Input.inner.keyMapping.set("keyr",    82);
    Input.inner.keyMapping.set("keys",    83);
    Input.inner.keyMapping.set("keyt",    84);
    Input.inner.keyMapping.set("keyu",    85);
    Input.inner.keyMapping.set("keyv",    86);
    Input.inner.keyMapping.set("keyw",    87);
    Input.inner.keyMapping.set("keyx",    88);
    Input.inner.keyMapping.set("keyy",    89);
    Input.inner.keyMapping.set("keyz",    90);
    Input.inner.keyMapping.set("leftwindowkey", 91);
    Input.inner.keyMapping.set("rightwindowkey",92);
    Input.inner.keyMapping.set("select",        93);
    Input.inner.keyMapping.set("num0", 96);
    Input.inner.keyMapping.set("num1", 97);
    Input.inner.keyMapping.set("num2", 98);
    Input.inner.keyMapping.set("num3", 99);
    Input.inner.keyMapping.set("num4", 100);
    Input.inner.keyMapping.set("num5", 101);
    Input.inner.keyMapping.set("num6", 102);
    Input.inner.keyMapping.set("num7", 103);
    Input.inner.keyMapping.set("num8", 104);
    Input.inner.keyMapping.set("num9", 105);
    Input.inner.keyMapping.set("multiply",    106);
    Input.inner.keyMapping.set("*",           106);
    Input.inner.keyMapping.set("add",         107);
    Input.inner.keyMapping.set("+",           107);
    Input.inner.keyMapping.set("subtract",    109);
    Input.inner.keyMapping.set("minus",       109);
    Input.inner.keyMapping.set("-",           109);
    Input.inner.keyMapping.set("decimalpoint",110);
    Input.inner.keyMapping.set("divide",      111);
    Input.inner.keyMapping.set("f1",    112);
    Input.inner.keyMapping.set("f2",    113);
    Input.inner.keyMapping.set("f3",    114);
    Input.inner.keyMapping.set("f4",    115);
    Input.inner.keyMapping.set("f5",    116);
    Input.inner.keyMapping.set("f6",    117);
    Input.inner.keyMapping.set("f7",    118);
    Input.inner.keyMapping.set("f8",    119);
    Input.inner.keyMapping.set("f9",    120);
    Input.inner.keyMapping.set("f10",   121);
    Input.inner.keyMapping.set("f11",   122);
    Input.inner.keyMapping.set("f12",   123);
    Input.inner.keyMapping.set("numlock",     144);
    Input.inner.keyMapping.set("scrolllock",  145);
    Input.inner.keyMapping.set("semicolon",   186);
    Input.inner.keyMapping.set("semi-colon",  186);
    Input.inner.keyMapping.set(";",           186);
    Input.inner.keyMapping.set("equal",       187);
    Input.inner.keyMapping.set("equalsign",   187);
    Input.inner.keyMapping.set("=",           187);
    Input.inner.keyMapping.set("comma",       188);
    Input.inner.keyMapping.set(",",           188);
    Input.inner.keyMapping.set("dash",        189);
    Input.inner.keyMapping.set("period",      190);
    Input.inner.keyMapping.set(".",           190);
    Input.inner.keyMapping.set("forwardslash",191);
    Input.inner.keyMapping.set("/",           191);
    Input.inner.keyMapping.set("openbracket", 219);
    Input.inner.keyMapping.set("(",           219);
    Input.inner.keyMapping.set("{",           219);
    Input.inner.keyMapping.set("[",           219);
    Input.inner.keyMapping.set("backslash",   220);
    Input.inner.keyMapping.set("\\",          220);
    Input.inner.keyMapping.set("closebraket", 221);
    Input.inner.keyMapping.set(")",           219);
    Input.inner.keyMapping.set("}",           219);
    Input.inner.keyMapping.set("]",           219);
    Input.inner.keyMapping.set("singlequote", 222);
    Input.inner.keyMapping.set("\'",          222);

    // keyboard EventListeners
    document.addEventListener('keydown', e => {
        let key = e.key.toLowerCase();
        let convertedKey = Input.inner.keyMapping.get(key);
        if(convertedKey){
            Input.inner.keysdownBuffer[convertedKey] = true;
        } else {
            console.log("Input can not process key:" + e.key);
        }
    }, false);

    document.addEventListener('keyup', e => {
        let key = e.key.toLowerCase();
        let convertedKey = Input.inner.keyMapping.get(key);
        if(convertedKey){
            Input.inner.keysupBuffer[convertedKey] = true;
        } else {
            console.log("Input can not process key:" + e.key);
        }
    }, false);

    // mouse EventListeners
    canvas.addEventListener("mousedown",  function(e){
        Input.inner.mousedownBuffer[e.button] = true;
    });
    window.addEventListener("mouseup",  function(e){ // registering the mouse up even out of focus
        Input.inner.mouseupBuffer[e.button] = true;
    });
    // make sure to reset mouse delta when entering the screen.
    canvas.addEventListener("mouseenter", function(e){
        let x = e.pageX - Input.inner.offsetX; //Get X,y where the canvas's position is origin.
        let y = e.pageY - Input.inner.offsetY;
        Input.inner.mousePositionDeltaBuffer[0] = 0;
        Input.inner.mousePositionDeltaBuffer[1] = 0;
        Input.inner.mousePosition[0] = x;
        Input.inner.mousePosition[1]= y;
    });
    canvas.addEventListener("wheel", function(e){
        let delta = Math.max(-1, Math.min(1, (e.deltaY || -e.detail)));
        Input.inner.mouseWheelDeltaBuffer += delta;
    }, {passive: true});

    canvas.addEventListener("mousemove", function(e){
        let x = e.pageX - Input.inner.offsetX; //Get X,y where the canvas's position is origin.
        let y = e.pageY - Input.inner.offsetY;
        Input.inner.mousePositionDeltaBuffer[0] += x - Input.inner.mousePosition[0]; //Difference since last mouse move
        Input.inner.mousePositionDeltaBuffer[1] += y - Input.inner.mousePosition[1];
        Input.inner.mousePosition[0] = x;
        Input.inner.mousePosition[1] = y;
    });

    canvas.addEventListener("touchmove", function(e){
        let x = e.touches[0].pageX - Input.inner.offsetX; //Get X,y where the canvas's position is origin.
        let y = e.touches[0].pageY - Input.inner.offsetY;
        Input.inner.mousePositionDeltaBuffer[0] += x - Input.inner.mousePosition[0]; //Difference since last mouse move
        Input.inner.mousePositionDeltaBuffer[1] += y - Input.inner.mousePosition[1];
        Input.inner.mousePosition[0] = x;
        Input.inner.mousePosition[1] = y;
    });
    canvas.addEventListener("touchstart", function(e){
        let x = e.touches[0].pageX - Input.inner.offsetX; //Get X,y where the canvas's position is origin.
        let y = e.touches[0].pageY - Input.inner.offsetY;
        Input.inner.mousePositionDeltaBuffer[0] = 0;
        Input.inner.mousePositionDeltaBuffer[1] = 0;
        Input.inner.mousePosition[0] = x;
        Input.inner.mousePosition[1]= y;
        Input.inner.mousedownBuffer[0] = true;
    });
    canvas.addEventListener("touchend", function(e){
        Input.inner.mousedownBuffer[0] = false;
    });
    canvas.addEventListener("touchcancel", function(e){
        Input.inner.mousedownBuffer[0] = false;
    });

    Input.isInitialized = true;
  }
}
