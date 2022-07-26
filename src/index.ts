// This will execute the setup function once the whole document has been loaded.
window.addEventListener("load",function(){
    setup();
});

function setup(): void{
    console.log("setup...")
    init();
}

function init(){
   console.log("init...")
}