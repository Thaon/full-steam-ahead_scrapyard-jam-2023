let checkpoints = [];
let peer = null;
let youWon = false;

const setupScene = (scene, level) => {
  // clear the scene
  scene.Clear();
  // parse the level we loaded
  level.forEach((object, index) => {
    let obj = null;
    // check for checkpoints
    if (object.name && object.name.split("_")[0] === "c") {
      checkpoints.push(object);
      checkpoints.sort((a, b) => {
        // sort by number
        return parseInt(a.name.split("_")[1]) - parseInt(b.name.split("_")[1]);
      });
      // skip loop
      return;
    }
    // check for premade objects
    if (engine.GetRegisteredClass(object.name)) {
      let objClass = engine.GetRegisteredClass(object.name);
      obj = new objClass.gameObjectClass(object.name);
      obj.name = object.name;
      obj.imageName = object.imageName;
      obj.x = object.x;
      obj.y = object.y;
      obj.z = object.zIndex;
      obj.width = object.width;
      obj.height = object.height;
      obj.rotation = object.rotation;
      obj.scaleX = object.scaleX;
      obj.scaleY = object.scaleY;
      if (obj.imageName != null && obj.imageName != "") {
        obj.SetSprite(object.imageName, true);
      }
      if (object.physics) {
        obj.physics = object.physics;
        obj.physicsType = object.physicsType || "box";
        obj.static = object.static ? true : false;
        obj.matchPhysics = object.matchPhysics;
        obj.SetRigidBody({
          type: object.physicsType,
          width: "auto",
          height: "auto",
          static: object.static,
        });
      }
    } else {
      obj = new GameObject(
        object.imageName + index,
        object.x,
        object.y,
        object.zIndex,
        0,
        0,
        object.rotation,
        object.scaleX,
        object.scaleY
      );
      obj.SetSprite(object.imageName, true);
    }

    scene.checkpoints = checkpoints;

    // deal with network instantiation
    if (object.name == "Ship") {
      object.x += 100 * networking.clients.length;
      networking.Add(object, true);
    } else scene.Add(obj);
  });
};

async function StartGame() {
  engine.debugPhysics = false;
  engine.physicsEngine.gravity = { x: 0, y: 0 };

  engine.sceneManager.AddScene("menu");
  engine.sceneManager.AddScene("game");
  engine.sceneManager.AddScene("game-over");

  LoadMenuScene();
  engine.Run("menu");
}

const LoadMenuScene = async () => {
  let scene = engine.sceneManager.GetScene("menu");

  let center = engine.canvas.width / 2;
  let third = engine.canvas.width / 3;

  scene.AddButton(
    "hostBtn",
    "Host",
    center - third / 2,
    100,
    third,
    100,
    "#fff",
    5,
    "center",
    () => {
      // init networking
      let peerID = window.prompt("Enter your peer ID");
      if (peerID == null) return;
      // replace spaces with _
      peerID = peerID.replace(/\s/g, "_");
      console.log("Creating host: " + peerID);
      networking.Host(peerID, LoadGameScene);
    }
  );

  scene.AddButton(
    "joinBtn",
    "Join",
    center - third / 2,
    300,
    third,
    100,
    "#fff",
    5,
    "center",
    () => {
      // init networking
      let peerID = window.prompt("Enter the host peer ID");
      if (peerID == null) return;
      // replace spaces with _
      peerID = peerID.replace(/\s/g, "_");
      networking.Join(peerID, LoadGameScene);
    }
  );
};

const LoadGameScene = async () => {
  let scene = engine.sceneManager.GetScene("game");

  const level = await engine.levelManager.LoadLevel(
    "racing track",
    "./assets/Level.js"
  );

  // setup scene and add gameobjects
  engine.sceneManager.LoadScene("game");

  setupScene(scene, level);

  engine.sceneManager.activeScene.Start();

  if (!networking.isHost) networking.SyncScene("game");
};

const LoadEndingScene = async () => {
  let scene = engine.sceneManager.GetScene("game-over");

  let center = engine.canvas.width / 2;
  let third = engine.canvas.width / 3;

  scene.AddButton(
    "restartBtn",
    youWon ? "You Won!" : "You Lost!",
    center - third / 2,
    engine.canvas.height / 2 - 100,
    third,
    100,
    "#fff",
    5,
    "center",
    () => {
      LoadMenuScene();
      engine.sceneManager.LoadScene("menu");
    }
  );

  engine.sceneManager.LoadScene("game-over");
};

networking.AddRPC("StartRace", () => {
  let localPlayer = null;
  engine.sceneManager.activeScene.objects.forEach((obj) => {
    if (obj.name == "Ship") {
      obj.canStart = true;
      if (obj.isMine) localPlayer = obj;
    }
  });
  // init scrap
  engine.sceneManager.activeScene.objects.forEach((obj) => {
    if (obj.name == "Scrap") {
      obj.SetPlayer(localPlayer);
    }
  });
});

networking.AddRPC("FinishRace", () => {
  console.log("Finished");
  engine.sceneManager.activeScene.objects.forEach((obj) => {
    if (obj.name == "Ship") {
      obj.canStart = false;
      if (obj.settings) obj.settings.destroy();
    }
  });
  setTimeout(() => {
    networking.ClearScene();
    LoadEndingScene();
    networking.Disconnect();
  }, 1000);
});
