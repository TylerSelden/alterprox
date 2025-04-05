import { AnsiUp } from './ansi_up.js'
let ansi_up = new AnsiUp();

let elems = {};
let socket;
let socketURL = "wss://server.benti.dev:8080";
let msgHistory = [];
let historyIndex = -1;
let config = {
  echo: true
}
let kxwt = {
  effects: {},
  members: {}
};
let buffer = "";

if (localStorage.getItem('msgHistory')) {
  msgHistory = JSON.parse(localStorage.getItem('msgHistory'));
}

window.onload = () => {
  let _elems = document.querySelectorAll("[id]");
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
    elems.input.value = "";
    elems.bars_container.classList.add("disabled");
  }
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
  let dataLines = buffer.split('\n').filter(line => line.startsWith('kxwt')).map(line => line.trim());
  buffer = buffer.split('\n').filter(line => !line.startsWith('kxwt')).join('\n');

  for (let line of dataLines) {
    if (!line.startsWith("kxwt")) continue;

    line = line.replace("kxwt_", "").split(' ');
    if (kxwtTriggers[line[0]]) kxwtTriggers[line[0]](line);
  }

  return buffer;
}

function conv(msg) {
  return ansi_up.ansi_to_html(msg);
}

function addContent(str) {
  let atBottom = elems.content_container.scrollHeight - elems.content_container.clientHeight <= elems.content_container.scrollTop + 2;

  buffer += str;
  elems.content.innerHTML = buffer;
  
  let MAXLEN = 100000;
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

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function fcap(str) {
  return str.split(' ').map(w => w.length > 2 ? cap(w) : w).join(' ');
}

let kxwtTriggers = {
  supported: (cmd) => {
    sendMsg("set kxwt on");
  },
  prompt: (cmd) => {
    for (let i in cmd) cmd[i] = (parseFloat(cmd[i]) || cmd[i]).toLocaleString();

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
    let name = cmd.slice(3).join(' ');
    name = cap(name);

    if (cmd[1] == 999) {
      return elems.nmy_text.innerText = `${name}: ${cmd[1]}`;
    }
    elems.nmy_text.innerText = `${name}: ${cmd[1]}%`;
  },
  myname: (cmd) => {
    kxwt.myname = cap(cmd[1]);
    refresh_sidebar();
  },
  rshort: (cmd) => {
    kxwt.area = cmd.slice(1).join(' ');
    refresh_sidebar();
  },
  position: (cmd) => {
    kxwt.pos = cmd[1];
    refresh_sidebar();
  },
  time: (cmd) => {
    kxwt.timeName = cap(cmd[2]);
    kxwt.timeLong = `${cmd[3]} ${cmd[4]}`;

    refresh_sidebar();
  },
  spst: (cmd) => {
    cmd = cmd.slice(1).join(' ').split(', ');
    kxwt.effects[cmd[0]] = cmd[1];
    refresh_sidebar();
  },
  spellup: (cmd) => {
    kxwt.effects[cmd.slice(1).join(' ')] = "New";
    refresh_sidebar();
  },
  spelldn: (cmd) => {
    delete kxwt.effects[cmd.slice(1).join(' ')];
    refresh_sidebar();
  },
  group_start: (cmd) => {
    kxwt.members = {};
  },
  group: (cmd) => {
    cmd[8] = cmd.slice(8).join(' ');
    kxwt.members[cmd[8]] = {
      hp: cmd[1],
      hp_max: cmd[2],
      hp_width: cmd[1] / cmd[2] * 100,
      mn: cmd[3],
      mn_max: cmd[4],
      mn_width: cmd[3] / cmd[4] * 100,
      mv: cmd[5],
      mv_max: cmd[6],
      mv_width: cmd[5] / cmd[6] * 100,
      tag: cmd[7],
      color: get_color(cmd[7])
    };
    refresh_sidebar();
  }
}

let group_colors = {
  '-': "gray",
  'L': "green",

  'X': "blue",
  'P': "gold",
  'M': "white",
  'O': "white",
  '?': "orange"
}
function get_color(str) {
  let tag = Object.keys(group_colors)
    .find(char => str.includes(char));
  return group_colors[tag];
}

function refresh_sidebar() {
  if (!kxwt.myname || !kxwt.area || !kxwt.timeName || !kxwt.pos) return;
  elems.side_panel.classList.remove("hidden");
 

  elems.kxwt_header.innerText = `${kxwt.myname} - ${kxwt.area}`;
  elems.kxwt_time.innerHTML = `<i>${kxwt.timeName}</i> - ${kxwt.timeLong}`;
  elems.kxwt_pos.innerText = kxwt.pos;

  // Is this bad practice? Absolutely.
  // Do I care? Not really. I think I
  // can trust Dentin not to XSS us
  // all. It makes the code more
  // readable, so...
  let effectsElem = "";
  for (let i in kxwt.effects) {
    if (parseInt(kxwt.effects[i].split(' ')[0]) == 0) delete kxwt.effects[i];
    effectsElem += `<p><b>${cap(i)}:</b> ${kxwt.effects[i]}</p>`
  }
  if (Object.keys(kxwt.effects).length == 0) {
    elems.effects.innerHTML = "<p><i>None</i></p>";
  } else {
    elems.effects.innerHTML = effectsElem;
  }

  let groupElem = "";
  for (let i in kxwt.members) {
    let member = kxwt.members[i];
    groupElem += `
<div class="group-member">
  <p class="${member.color}"><b>${i}</b></p>
  <div class="group-bars">
    <div class="bar">
      <div class="fill mn-bar" style="width: ${member.mn_width}%"></div>
      <span>${member.mn}/${member.mn_max}</span>
    </div>
    <div class="bar">
      <div class="fill hp-bar" style="width: ${member.hp_width}%"></div>
      <span>${member.hp}/${member.hp_max}</span>
    </div>
    <div class="bar">
      <div class="fill mv-bar" style="width: ${member.mv_width}%"></div>
      <span>${member.mv}/${member.mv_max}</span>
    </div>
  </div>
</div>`
  }
  if (Object.keys(kxwt.members).length < 2) {
    elems.group_container.classList.add("hidden");
  } else {
    elems.group.innerHTML = groupElem;
    elems.group_container.classList.remove("hidden");
  }
}
