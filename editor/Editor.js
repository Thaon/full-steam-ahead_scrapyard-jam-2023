// first we need to create a stage
const sceneWidth = window.innerWidth;
const sceneHeight = window.innerHeight;

let stage = new Konva.Stage({
  container: "container", // id of container <div>
  width: sceneWidth,
  height: sceneHeight,
  draggable: true,
});

let container = stage.container();
container.tabIndex = 1;
container.focus();

// then create layer
let layer = new Konva.Layer();

// add text at 0, 0
let text = new Konva.Text({
  text: "+",
  fontSize: 30,
  fontFamily: "Calibri",
  fill: "grey",
});
text.x(-text.width() / 2);
text.y(-text.height() / 2);
layer.add(text);

// // create our shape
// let circle = new Konva.Circle({
//   x: stage.width() / 2,
//   y: stage.height() / 2,
//   radius: 70,
//   fill: "red",
//   stroke: "black",
//   strokeWidth: 4,
//   draggable: true,
// });

// // add the shape to the layer
// layer.add(circle);

// add the layer to the stage
stage.add(layer);

// draw the image
layer.draw();

// Selection
let tr = new Konva.Transformer();
layer.add(tr);

// clicks should select/deselect shapes
stage.on("click tap", function (e) {
  // if click on empty area - remove all selections
  if (e.target === stage) {
    tr.nodes([]);
    if (settings?.destroy) setupToolbar();
    return;
  }
  tr.zIndex(999);

  let toSelect = e.target;
  if (toSelect.className == "Text") return;
  // do we pressed shift or ctrl?
  const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
  const isSelected = tr.nodes().indexOf(toSelect) >= 0;

  if (!metaPressed && !isSelected) {
    // if no key pressed and the node is not selected
    // select just one
    tr.nodes([toSelect]);
  } else if (metaPressed && isSelected) {
    // if we pressed keys and node was selected
    // we need to remove it from selection:
    const nodes = tr.nodes().slice(); // use slice to have new copy of array
    // remove node from array
    nodes.splice(nodes.indexOf(toSelect), 1);
    tr.nodes(nodes);
  } else if (metaPressed && !isSelected) {
    // add the node into selection
    const nodes = tr.nodes().concat([toSelect]);
    tr.nodes(nodes);
  }

  // if we have exactly one node, let's open the inspector
  if (tr.nodes().length == 1) {
    setupSettings(tr.nodes()[0]);
  } else if (settings?.destroy) setupToolbar();
});

let group = new Konva.Group();
layer.add(group);

// Zoom
let scaleBy = 1.05;
stage.on("wheel", (e) => {
  // stop default scrolling
  e.evt.preventDefault();

  let oldScale = stage.scaleX();
  let pointer = stage.getPointerPosition();

  let mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  // how to scale? Zoom in? Or zoom out?
  let direction = e.evt.deltaY > 0 ? 1 : -1;

  // when we zoom on trackpad, e.evt.ctrlKey is true
  // in that case lets revert direction
  if (e.evt.ctrlKey) {
    direction = -direction;
  }

  let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

  stage.scale({ x: newScale, y: newScale });

  let newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };
  stage.position(newPos);
});

// Editor Utils
container.addEventListener("keydown", function (e) {
  let char = String.fromCharCode(e.keyCode);
  let pointerPos = group.getRelativePointerPosition();

  // change z index
  if (parseInt(char) >= 0 && parseInt(char) <= 9) {
    if (tr.nodes().length == 1) {
      let node = tr.nodes()[0];
      node.zIndex(parseInt(char));
    }
  }

  switch (char) {
    // Destroy selection
    case "X":
      if (tr.nodes().length > 0) {
        tr.nodes().forEach((node) => {
          node.destroy();
        });
        tr.nodes([]);
      }
      break;
    // Create circle at mouuse position
    case "C":
      // if we have a selection of a single node, we customize it
      if (tr.nodes().length == 1) {
        console.log(
          tr.nodes()[0].position(),
          tr.nodes()[0].getTransform(),
          tr.nodes()[0].offset()
        );
        let nodePos = tr.nodes()[0].getPosition();
        if (tr.nodes()[0].className == "Image" || tr.nodes()[0].name() != "")
          return;
        // get image path from file explorer
        let f = document.createElement("input");
        f.style.display = "none";
        f.type = "file";
        f.name = "file";
        document.getElementById("container").appendChild(f);
        f.click();
        f.onchange = function () {
          let file = f.files[0];
          let reader = new FileReader();
          reader.onload = function (e) {
            let img = new Image();
            img.src = e.target.result;
            img.onload = function () {
              let image = new Konva.Image({
                x: nodePos.x,
                y: nodePos.y,
                // setup the offset so that we center the new image
                offsetX: img.width / 2,
                offsetY: img.height / 2,
                image: img,
                draggable: true,
                imageB64: e.target.result,
                imageName: file.name.split(".")[0],
              });
              tr.nodes()[0].destroy();
              tr.nodes([image]);
              layer.add(image);
              layer.draw();
            };
          };
          reader.readAsDataURL(file);
        };
      }
      // if we have a selection of none, we create a new one
      else if (tr.nodes().length == 0) {
        let circle = new Konva.Circle({
          x: pointerPos.x,
          y: pointerPos.y,
          radius: 10,
          fill: "white",
          stroke: "black",
          strokeWidth: 4,
          draggable: true,
        });
        layer.add(circle);
        tr.nodes([circle]);
        setupSettings(circle);
        layer.draw();
      } else tr.nodes([]); // if we have a selection of multiple nodes, we deselect them
      break;
    // Duplicate selection
    case "D":
      if (tr.nodes().length > 0) {
        // calculate center of selection
        let x = 0;
        let y = 0;
        tr.nodes().forEach((node) => {
          x += node.x();
          y += node.y();
        });
        x /= tr.nodes().length;
        y /= tr.nodes().length;
        // duplicate selection
        tr.nodes().forEach((node) => {
          let clone = node.clone();
          // calculate offset from center
          let offsetX = node.x() - x;
          let offsetY = node.y() - y;
          // set positions centered on mouse bt mantaining relative offsets between them
          clone.x(pointerPos.x + offsetX);
          clone.y(pointerPos.y + offsetY);
          // if node has name, we create a text node
          if (node.name() != "") {
            let newGroup = new Konva.Group({
              draggable: true,
            });
            let text = new Konva.Text({
              x: clone.x(),
              y: clone.y() + clone.height() + 10,
              text: node.name(),
              fontSize: 30,
              fontFamily: "Calibri",
              align: "center",
              width: clone.width(),
            });
            newGroup.add(clone);
            clone.draggable(false);
            newGroup.add(text);
            layer.add(newGroup);
          } else {
            layer.add(clone);
          }
          layer.draw();
        });
      }
      break;
    // Give object a name
    case "N":
      // if we have a selection of a single node, we name it
      if (tr.nodes().length == 1) {
        let node = tr.nodes()[0];
        if (node.name() != "") return;
        let name = prompt("Enter Name");
        let newGroup = new Konva.Group({
          draggable: true,
        });
        newGroup.add(node);
        node.draggable(false);
        node.name(name);
        // add text and group them
        let text = new Konva.Text({
          x: node.x(),
          y: node.y() + node.height() + 10,
          text: name,
          fontSize: 30,
          fontFamily: "Calibri",
          align: "center",
          width: node.width(),
        });
        newGroup.add(text);
        layer.add(newGroup);
        layer.draw();
      }
      break;

    // Save stage to a file
    case "S":
      saveStage();
      break;
  }
  e.preventDefault();
});

const saveStage = () => {
  let toSave = stage.toJSON();
  toSave = JSON.parse(toSave);
  // flatten the children array recursively
  let children = [];
  let flatten = function (arr) {
    if (Array.isArray(arr)) {
      arr.forEach((child) => {
        if (child.children) {
          flatten(child.children);
        }
        if (child.className == "Image" || child.attrs?.name != null) {
          children.push(child.attrs);
        }
      });
    }
  };
  flatten(toSave.children);
  let a = document.createElement("a");
  let jsToExport = `const getLevel = () => { return { gameObjects: 
        ${JSON.stringify(children)}
     } }`;
  let file = new Blob([jsToExport], {
    type: "text/javascript",
  });
  a.href = URL.createObjectURL(file);
  a.download = "Level.js";
  a.click();
};

const loadStage = (path) => {
  let p = new Promise((resolve, reject) => {
    require([path], () => {
      let levelData = getLevel().gameObjects;
      processLevel(levelData);
    });

    // process the level data asynchronously
    const processLevel = async (levelData) => {
      // load all images
      let images = [];
      levelData.forEach((obj) => {
        if (obj.imageB64) {
          images.push(
            new Promise((resolve, reject) => {
              let img = new Image();
              img.src = obj.imageB64;
              img.onload = () => {
                obj.image = img;
                resolve();
              };
            })
          );
        }
      });
      await Promise.all(images);
      // create all objects
      levelData.forEach((obj) => {
        let node = null;
        if (obj.image) {
          node = new Konva.Image({
            x: obj.x,
            y: obj.y,
            offsetX: obj.image.width / 2,
            offsetY: obj.image.height / 2,
            rotation: obj.rotation,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            image: obj.image,
            draggable: true,
            imageB64: obj.imageB64,
            imageName: obj.imageName,
            name: obj.name,
            physics: obj.physics,
            physicsType: obj.physicsType,
            static: obj.static,
            matchPhysics: obj.matchPhysics,
          });
        } else {
          node = new Konva.Circle({
            x: obj.x,
            y: obj.y,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            radius: obj.radius,
            fill: "white",
            stroke: "black",
            strokeWidth: 4,
            draggable: true,
            name: obj.name,
          });
        }
        layer.add(node);
      });
      layer.draw();
      resolve();
    };
  });

  return p;
};

function fitStageIntoParentContainer() {
  let container = document.querySelector("#stage-parent");

  // now we need to fit stage into parent container
  let containerWidth = container.offsetWidth;

  // but we also make the full scene visible
  // so we need to scale all objects on canvas
  let scale = containerWidth / sceneWidth;

  stage.width(sceneWidth * scale);
  stage.height(sceneHeight * scale);
  stage.scale({ x: scale, y: scale });
}

fitStageIntoParentContainer();
// adapt the stage on any window resize
window.addEventListener("resize", fitStageIntoParentContainer);

// SETTINGS!
let settings = null;

const setupToolbar = () => {
  if (settings?.destroy) settings.destroy();
  settings = QuickSettings.create(0, 0, "Toolbar");
  settings.setDraggable(true);
  settings.addButton("New", () => {
    let circle = new Konva.Circle({
      x: stage.width() / 2,
      y: stage.height() / 2,
      radius: 10,
      fill: "white",
      stroke: "black",
      strokeWidth: 4,
      draggable: true,
    });
    layer.add(circle);
    tr.nodes([circle]);
    setupSettings(circle);
    layer.draw();
  });
  settings.addButton("Save", () => {
    saveStage();
  });
  settings.addFileChooser("Load", "Load", "text/javascript", (file) => {
    // get file path
    let path = URL.createObjectURL(file);
    // load stage
    loadStage(path).then(() => {
      URL.revokeObjectURL(path);
    });
  });
};

const setupSettings = (node) => {
  if (settings?.destroy) settings.destroy();
  settings = QuickSettings.create(0, 0, "Inspector");
  settings.setDraggable(true);

  settings.addText("Name", node.name(), (name) => {
    node.name(name);
  });
  // setup image
  if (node.className == "Image") {
    settings.addImage("Image", node.attrs.imageB64, (img) => {
      node.image(img);
      layer.draw();
    });
  }
  settings.addFileChooser(
    "Change Image",
    node.attrs?.imageName || "Circle",
    "image/*",
    (file) => {
      let nodePos = node.getPosition();
      let reader = new FileReader();
      reader.onload = function (e) {
        let img = new Image();
        img.src = e.target.result;
        img.onload = function () {
          let image = new Konva.Image({
            x: nodePos.x,
            y: nodePos.y,
            offsetX: img.width / 2,
            offsetY: img.height / 2,
            rotation: node.rotation(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            image: img,
            draggable: true,
            imageB64: e.target.result,
            imageName: file.name.split(".")[0],
            name: node.name(),
          });
          tr.nodes()[0].destroy();
          tr.nodes([image]);
          if (settings?.destroy) setupToolbar();
          setupSettings(image);
          layer.add(image);
          layer.draw();
        };
      };
      reader.readAsDataURL(file);
    }
  );
  // position, rotation and scale
  settings.addNumber("X", -Infinity, Infinity, node.x(), 1, (x) => {
    node.x(x);
    layer.draw();
  });
  settings.addNumber("Y", -Infinity, Infinity, node.y(), 1, (y) => {
    node.y(y);
    layer.draw();
  });
  settings.addRange("Rotation", -360, 360, node.rotation(), 1, (r) => {
    node.rotation(r);
    layer.draw();
  });
  settings.addNumber(
    "Scale X",
    -Infinity,
    Infinity,
    node.scaleX(),
    0.1,
    (s) => {
      node.scaleX(s);
      layer.draw();
    }
  );
  settings.addNumber(
    "Scale Y",
    -Infinity,
    Infinity,
    node.scaleY(),
    0.1,
    (s) => {
      node.scaleY(s);
      layer.draw();
    }
  );

  // setup z index
  settings.addRange("Z Index", 0, 10, node.zIndex(), 1, (z) => {
    node.zIndex(z);
    layer.draw();
  });

  // setup physics and physics matching
  settings.addBoolean("Physics", node.attrs.physics, (p) => {
    node.setAttr("physics", p);
    // update control
    if (!p) {
      settings.hideControl("Match Physics");
      settings.hideControl("Is Static");
      settings.hideControl("Physics Type");
    } else {
      settings.showControl("Match Physics");
      settings.showControl("Is Static");
      settings.showControl("Physics Type");
      node.setAttr("matchPhysics", false);
      node.setAttr("static", false);
      node.setAttr("physicsType", "box");
    }
  });

  settings.addDropDown(
    "Physics Type",
    ["box", "circle"],
    node.attrs.physicsType,
    (t) => {
      node.setAttr("physicsType", t);
    }
  );

  settings.addBoolean("Is Static", node.attrs.static, (s) => {
    node.setAttr("static", s);
  });

  settings.addBoolean("Match Physics", node.attrs.matchPhysics, (p) => {
    node.setAttr("matchPhysics", p);
    console.log(node);
  });

  // init control
  if (!node.attrs.physics) {
    settings.hideControl("Match Physics");
    settings.hideControl("Is Static");
    settings.hideControl("Physics Type");
  } else {
    settings.showControl("Match Physics");
    settings.showControl("Is Static");
    settings.showControl("Physics Type");
  }
};

// initialize the toolbar
setupToolbar();
