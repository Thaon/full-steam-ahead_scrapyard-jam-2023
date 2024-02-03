class Networking {
  constructor(baseDomain) {
    this.baseDomain = baseDomain;
  }

  baseDomain = "";
  peer = null;
  connectionToHost = null;
  clients = [];
  isHost = false;
  dataMap = {};
  ownedObjects = [];
  rpcs = {};

  Host(hostID, callback) {
    this.isHost = true;
    this.peer = new Peer(this.baseDomain + " " + hostID);
    this.peer.on("open", (id) => {
      //   console.log("My peer ID is: " + id);
      this.connectionToHost = this.peer;
      callback();
    });
    this.peer.on("connection", (conn) => {
      //   console.log("New connection from: " + conn.peer);
      this.clients.push(conn);
      this.dataMap[conn.peer] = {
        objects: [],
      };
      conn.on("data", (data) => {
        // console.log("The Host received data");
        this.OnData(data, false, conn.peer);
      });
      conn.on("close", () => {
        // console.log("Disconnected from: " + conn.peer);
        this.clients = this.clients.filter((c) => c.peer !== conn.peer);
        // clean up objects
        this.dataMap[conn.peer].objects.forEach((netID) => {
          this.Destroy(netID);
        });
      });
    });
    this.peer.on("error", (err) => {
      console.log("Error: " + err);
    });
    this.peer.on("disconnected", () => {
      //   console.log("Disconnected from peer");
    });
  }

  Join(hostID, callback) {
    this.isHost = false;
    // console.log("Connecting to host: " + this.baseDomain + " " + hostID);
    this.peer = new Peer();
    this.peer.on("open", (id) => {
      //   console.log("My peer ID is: " + id);
      this.connectionToHost = this.peer.connect(this.baseDomain + " " + hostID);
      this.connectionToHost.on("open", () => {
        // console.log("Connected to host");
        callback();
        // Receive messages
        this.connectionToHost.on("data", (data) => {
          //   console.log("The Client received data", data);
          this.OnData(data, true, this.connectionToHost.peer.id);
        });
      });
    });
  }

  Disconnect = () => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    if (this.isHost) {
      // disconnect all clients
      this.clients.forEach((client) => {
        client.close();
      });
    } else {
      // disconnect from host
      this.connectionToHost.close();
    }
  };

  OnData = (data, isHost, clientPeerID) => {
    // check for message type
    switch (data.type) {
      case "message":
        console.log("Received message: " + data.data);
        break;
      case "sync-scene":
        if (this.isHost) {
          // get scene
          let scene = engine.sceneManager.GetScene(data.data);
          let objectsToSend = [];
          scene.objects
            .filter((obj) => obj.networkID != null)
            .forEach((obj) => {
              // check that the peer does not own the object already
              if (this.dataMap[clientPeerID].objects.includes(obj.networkID)) {
                return;
              }
              objectsToSend.push({
                name: obj.name,
                imageName: obj.imageName,
                x: obj.x,
                y: obj.y,
                zIndex: obj.z,
                rotation: obj.rotation,
                width: obj.width,
                height: obj.height,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                physics: obj.physics,
                physicsType: obj.physics?.type,
                static: obj.physics?.static,
                matchPhysics: obj.matchPhysics,
                networkID: obj.networkID,
              });
            });

          // send scene to client
          this.clients.forEach((client) => {
            client.send({
              type: "sync-scene",
              data: objectsToSend,
            });
          });
        } else {
          let sceneData = data.data;
          // add objects to scene
          sceneData.forEach((objData) => {
            this.InstantiateObject(objData, true);
          });

          //   engine.sceneManager.activeScene.Start();
        }
        break;

      case "add":
        let addObjData = data.data;
        let callStart = addObjData.callStart;
        this.InstantiateObject(addObjData, callStart);

        // message is coming from thie host
        if (isHost) {
          // message is coming from the host
        } else {
          // message is coming from a client
          if (this.isHost) {
            // add to data map
            this.dataMap[clientPeerID].objects.push(addObjData.networkID);
          }
        }

        // broadcast to clients
        if (this.isHost) {
          this.clients.forEach((client) => {
            client.send({
              type: "add",
              data: addObjData,
            });
          });
        }

        break;

      case "update":
        let updateObjData = data.data;
        let toUpdate = this.findObjectWithNetID(updateObjData.networkID);
        if (toUpdate == null) {
          console.log(
            "Could not find object with network ID: " + updateObjData.networkID
          );
          return;
        }
        if (toUpdate.isMine) {
          return;
        }

        // update object
        Object.assign(toUpdate, updateObjData.data);

        // broadcast to clients
        if (this.isHost) {
          this.clients.forEach((client) => {
            // check if client owns object
            let clientOwnsObject = this.dataMap[client.peer].objects.includes(
              updateObjData.networkID
            );
            if (clientOwnsObject) {
              return;
            }
            client.send({
              type: "update",
              data: {
                networkID: updateObjData.networkID,
                data: updateObjData.data,
              },
            });
          });
        }
        break;

      case "remove":
        let toRemove = this.findObjectWithNetID(data.data);
        if (toRemove == null) {
          console.log("Could not find object with network ID: " + data.data);
          return;
        }
        // remove object
        engine.sceneManager.activeScene.Destroy(toRemove);

        if (isHost) {
        } else {
          if (this.isHost) {
            // remove from data map
            this.dataMap[clientPeerID].objects = this.dataMap[
              clientPeerID
            ].objects.filter((netID) => netID !== data.data);
          }
        }

        if (this.isHost) {
          // broadcast to clients
          this.clients.forEach((client) => {
            client.send({
              type: "remove",
              data: data.data,
            });
          });
        }
        break;

      case "rpc-target":
        let rpcObjData = data.data;
        let toRPC = this.findObjectWithNetID(rpcObjData.networkID);
        if (toRPC == null) {
          console.log(
            "Could not find object with network ID: " + rpcObjData.networkID
          );
          return;
        }
        // call function
        toRPC[rpcObjData.funcName](...rpcObjData.args);

        // broadcast to clients
        if (this.isHost) {
          this.clients.forEach((client) => {
            client.send({
              type: "rpc",
              data: {
                networkID: rpcObjData.networkID,
                funcName: rpcObjData.funcName,
                args: rpcObjData.args,
              },
            });
          });
        }
        break;

      case "rpc":
        console.log("Received RPC from Host?" + isHost);
        let rpcData = data.data;
        let toCall = this.rpcs[rpcData.funcName];
        if (toCall == null) {
          console.log("Could not find function with name: " + rpcData.funcName);
          return;
        }
        // call function
        toCall(...rpcData.args);

        // broadcast to clients
        if (isHost) {
          this.clients.forEach((client) => {
            client.send({
              type: "rpc",
              data: {
                funcName: rpcData.funcName,
                args: rpcData.args,
              },
            });
          });
        }
        break;

      default:
        console.log("Received unknown message type: " + data.type);
        break;
    }
  };

  // only clients can request a sync with the host
  SyncScene = (scene) => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    // send scene data to host
    this.connectionToHost.send({
      type: "sync-scene",
      data: scene,
    });
  };

  ClearScene = () => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    if (this.isHost) {
      // clear all the networked objects by destroying them
      this.clients.forEach((client) => {
        this.dataMap[client.peer].objects.forEach((netID) => {
          this.Destroy(netID);
        });
      });
    }
  };

  InstantiateObject = (addObjData, callStart) => {
    let toAdd = null;

    if (engine.GetRegisteredClass(addObjData.name)) {
      let objClass = engine.GetRegisteredClass(addObjData.name);
      toAdd = new objClass.gameObjectClass(addObjData.name);
    } else {
      toAdd = new GameObject(addObjData.name);
    }
    toAdd.imageName = addObjData.imageName;
    toAdd.x = addObjData.x;
    toAdd.y = addObjData.y;
    toAdd.z = addObjData.zIndex;
    toAdd.width = addObjData.width;
    toAdd.height = addObjData.height;
    toAdd.rotation = addObjData.rotation;
    toAdd.scaleX = addObjData.scaleX;
    toAdd.scaleY = addObjData.scaleY;

    // setup image
    if (toAdd.imageName != null && toAdd.imageName != "")
      toAdd.SetSprite(addObjData.imageName, true);
    // setup physics
    if (addObjData.physics) {
      toAdd.physics = addObjData.physics;
      toAdd.physicsType = addObjData.physicsType || "box";
      toAdd.static = addObjData.static ? true : false;
      toAdd.matchPhysics = addObjData.matchPhysics;
      toAdd.SetRigidBody({
        type: toAdd.physicsType,
        width: "auto",
        height: "auto",
        static: toAdd.static,
      });
      toAdd.matchPhysics = addObjData.matchPhysics;
    }
    // setup networking
    toAdd.networkID = addObjData.networkID;
    toAdd.isMine = this.ownedObjects.includes(addObjData.networkID);
    console.log(toAdd.networkID, toAdd.isMine);
    // add to scene
    engine.sceneManager.activeScene.Add(toAdd);
    if (callStart) {
      console.log("Calling Start");
      toAdd.Start();
    }
  };

  AddRPC = (funcName, func) => {
    this.rpcs[funcName] = func;
  };

  // creating CRUD operations for networking
  Add = (obj, callStart) => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    // generate network id
    let networkID = nanoid();
    // add to data map
    let objData = {
      ...obj,
      networkID: networkID,
      callStart: callStart,
    };

    // update owned objects
    this.ownedObjects.push(networkID);

    if (this.isHost) {
      // send object to all clients
      this.clients.forEach((client) => {
        client.send({
          type: "add",
          data: objData,
        });
      });
      // call add on host
      this.OnData(
        {
          type: "add",
          data: objData,
        },
        this.isHost,
        this.peer.id
      );
    } else {
      // send object to host
      this.connectionToHost.send({
        type: "add",
        data: objData,
      });
    }
  };

  Update = (networkID, data) => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    if (this.isHost) {
      // send object to all clients
      this.clients.forEach((client) => {
        // check if client owns object
        let clientOwnsObject =
          this.dataMap[client.peer].objects.includes(networkID);
        if (clientOwnsObject) {
          return;
        }
        client.send({
          type: "update",
          data: {
            networkID: networkID,
            data: data,
          },
        });
      });
      // call update on host
      this.OnData({
        type: "update",
        data: {
          networkID: networkID,
          data: data,
        },
      });
    } else {
      // send object to host
      this.connectionToHost.send({
        type: "update",
        data: {
          networkID: networkID,
          data: data,
        },
      });
    }
  };

  Destroy = (networkID) => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    // update owned objects
    this.ownedObjects = this.ownedObjects.filter(
      (netID) => netID !== networkID
    );

    if (this.isHost) {
      // send object to all clients
      this.clients.forEach((client) => {
        client.send({
          type: "remove",
          data: networkID,
        });
      });
      // call remove on host
      this.OnData(
        {
          type: "remove",
          data: networkID,
        },
        this.isHost
      );
    } else {
      // send object to host
      this.connectionToHost.send({
        type: "remove",
        data: networkID,
      });
    }
  };

  RPC = (funcName, ...args) => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    if (this.isHost) {
      console.log("Sending RPC to all clients");
      // call rpc on host, this also sends it to all clients
      this.OnData(
        {
          type: "rpc",
          data: {
            funcName: funcName,
            args: args,
          },
        },
        this.isHost
      );
    } else {
      console.log("Sending RPC to host");
      // send object to host
      this.connectionToHost.send({
        type: "rpc",
        data: {
          funcName: funcName,
          args: args,
        },
      });
    }
  };

  TargetRPC = (networkID, funcName, ...args) => {
    if (this.connectionToHost == null) {
      console.log("Not connected to host");
      return;
    }
    if (this.isHost) {
      // call rpc on host, this also sends it to all clients
      this.OnData(
        {
          type: "rpc-target",
          data: {
            networkID: networkID,
            funcName: funcName,
            args: args,
          },
        },
        this.isHost
      );
    } else {
      // send object to host
      this.connectionToHost.send({
        type: "rpc-target",
        data: {
          networkID: networkID,
          funcName: funcName,
          args: args,
        },
      });
    }
  };

  // utils

  findObjectWithNetID = (netID) => {
    let obj = engine.sceneManager.activeScene.objects.find(
      (obj) => obj.networkID == netID
    );
    if (obj == null) {
      return null;
    }
    return obj;
  };
}

const networking = new Networking("full_steam_ahead");
