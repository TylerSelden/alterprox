import { AnsiUp } from './ansi_up.js'
var ansi_up = new AnsiUp();

var elems = {};
var socket;
var socketURL = "wss://benti.dev:8080";
var msgHistory = [];
var historyIndex = -1;
var config = {
  echo: true
}
var kxwt = {};
var buffer = "";

if (localStorage.getItem('msgHistory')) {
  msgHistory = JSON.parse(localStorage.getItem('msgHistory'));
}

window.onload = () => {
  var _elems = document.querySelectorAll("[id]");
  _elems.forEach((elem) => {
    elems[elem.id] = elem;
  });

  elems.input.addEventListener("keydown", handleKeydown);

  connect();
}

function connect() {
  socket = new WebSocket(socketURL);
  
  socket.onopen = () => {
    elems.status.innerText = "Connected";
    elems.input.disabled = false;
    elems.bars_container.classList.remove("disabled");
    elems.input.focus();
  }

  socket.onmessage = (msg) => {
    msg = msg.data;
    displayMsg(msg);
  }

  socket.onclose = () => {
    elems.status.innerText = "Disconnected";
    elems.input.disabled = true;
    elems.bars_container.classList.add("disabled");
  }
  window.socket = socket;
}


function displayMsg(msg) {
  addContent(conv(processCmd(msg)));
}

function processCmd(msg) {
  const IAC = '\xFF'; // Interpret As Command
  const WILL = '\xFB';
  const WONT = '\xFC';
  const DO = '\xFD';
  const DONT = '\xFE';
  const ECHO = '\x01';
  
  let buffer = '';
  let i = 0;

  while (i < msg.length) {
    if (msg[i] === IAC) {
      i++; // Move past the IAC
      if (i < msg.length) {
        let command = msg[i++];
        if (i < msg.length) {
          let option = msg[i++];

          // Handle commands like ECHO
          if (command === WILL && option === ECHO) {
            elems.input.classList.add("password");
            config.echo = false;
            elems.input.focus();
          } else if (command === WONT && option === ECHO) {
            elems.input.classList.remove("password");
            config.echo = true;
          }
          // Other commands can be handled or ignored as needed.
        }
      }
    } else {
      buffer += msg[i++];
    }
  }

  // handle KXWT data... eventually.
  var dataLines = buffer.split('\n').filter(line => line.startsWith('kxwt')).map(line => line.trim());
  buffer = buffer.split('\n').filter(line => !line.startsWith('kxwt')).join('\n');

  for (var line of dataLines) {
    if (!line.startsWith("kxwt")) continue;


    line = line.replace("kxwt_", "").split(' ');
    if (kxwtTriggers[line[0]]) kxwtTriggers[line[0]](line);

    //if (line == "kxwt_supported") {
    //  sendMsg("set kxwt on");
    //}
  }

  return buffer;
}

function conv(msg) {
  return ansi_up.ansi_to_html(msg);
}

function addContent(str) {
  var atBottom = elems.content_container.scrollHeight - elems.content_container.clientHeight <= elems.content_container.scrollTop + 2;

  buffer += str;
  elems.content.innerHTML = buffer;
  
  var MAXLEN = 100000;
  while (elems.content.innerHTML.length > MAXLEN) {
    elems.content.removeChild(elems.content.firstChild);
    buffer = elems.content.innerHTML;
  }

  if (atBottom) elems.content_container.scrollTop = elems.content_container.scrollHeight;

}

function sendMsg(msg) {
  if (!msg) {
    msg = elems.input.value;
    if ((msgHistory.length === 0 || msgHistory[msgHistory.length - 1] !== msg) && config.echo == true) msgHistory.push(msg);
  }  
  historyIndex = msgHistory.length;
  if (msg == "clear") {
    buffer = "";
    elems.content.innerHTML = buffer;
    elems.input.value = "";
  }

  socket.send(msg + "\n");
  if (!config.echo) elems.input.value = "";
  elems.input.select();

  if (config.echo) {
    while (elems.content.innerText.endsWith('\n')) elems.content.innerText = elems.content.innerText.slice(0, -1);
    addContent(`<span style="font-weight:bold;color:#cc00cc">${msg}</span>`);
  }
}

function handleKeydown(evt) {
  if (evt.key === "Enter") {
    evt.preventDefault();
    sendMsg();
  } else if (evt.key === "ArrowUp" && !evt.shiftKey) {
    if (historyIndex <= 0) return;
    evt.preventDefault();
    historyIndex--;
    elems.input.value = msgHistory[historyIndex];
  } else if (evt.key === "ArrowDown" && !evt.shiftKey) {
    if (historyIndex < msgHistory.length - 1) {
      evt.preventDefault();
      historyIndex++;
      elems.input.value = msgHistory[historyIndex];
    } else if (historyIndex === msgHistory.length - 1) {
      historyIndex++;
      evt.preventDefault;
      elems.input.value = "";
    }
  }
}


var kxwtTriggers = {
  supported: (cmd) => {
    sendMsg("set kxwt on");
  },
  prompt: (cmd) => {
    for (var i in cmd) cmd[i] = (parseFloat(cmd[i]) || cmd[i]).toLocaleString();

    elems.hp.style.width = `${(cmd[1] / cmd[2]) * 100}%`;
    elems.hp_text.innerText = `${cmd[1]}/${cmd[2]} hp`;
    elems.mn.style.width = `${(cmd[3] / cmd[4]) * 100}%`;
    elems.mn_text.innerText = `${cmd[3]}/${cmd[4]} mn`;
    elems.mv.style.width = `${(cmd[5] / cmd[6]) * 100}%`;
    elems.mv_text.innerText = `${cmd[5]}/${cmd[6]} mv`;
  },
  gold: (cmd) => {
    //    elems.gld.style.width = `${Math.min((cmd[1] / 1000) * 100, 100)}%`;
    elems.gld_text.innerText = `${parseFloat(cmd[1]).toLocaleString()} gold`;
  },
  exp: (cmd) => {
    elems.xp_text.innerText = `${parseFloat(cmd[1]).toLocaleString()} xp`;
  },
  fighting: (cmd) => {
    cmd[1] = parseFloat(cmd[1]);
    
    if (cmd[1] == -1) {
      elems.nmy.style.width = "0%";
      return elems.nmy_text.innerText = "No enemy";
    }

    elems.nmy.style.width = `${Math.min(cmd[1], 100)}%`;
    var name = cmd.slice(3).join(' ');
    name = name.charAt(0).toUpperCase() + name.slice(1);

    if (cmd[1] == 999) {
      return elems.nmy_text.innerText = `${name}: ${cmd[1]}`;
    }
    console.log(`  ASDF: ${cmd}`);
    elems.nmy_text.innerText = `${name}: ${cmd[1]}%`;
  }
}
