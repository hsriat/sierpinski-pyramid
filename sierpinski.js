const Sierpinski = {
  showReal3D          : !!window.location.hash.match(/3d/),
  minSide             : window.location.hash.match(/3d/) ? 10 : 30,
  perpendicularFactor : 1/2 * Math.tan(1/2 * Math.acos(1/Math.sqrt(3))), // TODO - there's a mistake here, pyramid is slightly skewed
  sqrtOf2             : Math.sqrt(2),
  fillStyle           : "rgba(102,102,153,0.5)",
  rotationPerDelta    : Math.PI / 360, // half degree per 1 delta wheel-event
  pixelsBetweenEyes   : 110,
  parallaxAngle       : 0.04 //radians
};

window.onload = function() {
  const canvas  = document.body.appendChild(document.createElement('canvas'));

  const dpr     = window.devicePixelRatio || 1;
  const height  = window.innerHeight * dpr;
  const width   = window.innerWidth * dpr;

  canvas.height       = height;
  canvas.width        = width;
  canvas.style.height = `${height / dpr}px`;
  canvas.style.width  = `${width / dpr}px`;

  const ctx       = canvas.getContext("2d");
  ctx.fillStyle   = Sierpinski.fillStyle;
  ctx.scale(dpr, dpr);

  const side  = Sierpinski.showReal3D ? 120 : width / (dpr * 2);
  const x     = width / (dpr * 2);
  const y     = height / (dpr * 2);
  const z     = 0;

  let x1 = x;
  let x2;

  if (Sierpinski.showReal3D) {
    x1 = x + dpr * Sierpinski.pixelsBetweenEyes / 2;
    x2 = x - dpr * Sierpinski.pixelsBetweenEyes / 2;
  }

  let tree1, tree2;

  tree1 = new SierpinskiTree();
  tree1.draw(ctx, side,
    {x: Sierpinski.showReal3D ? x1 : x, y: y, z: z},
    {x: 0, y: Sierpinski.showReal3D ? -Sierpinski.parallaxAngle/2 : 0, z: 0}
  );

  if (Sierpinski.showReal3D) {
    tree2 = new SierpinskiTree();
    tree2.draw(ctx, side,
      {x: x2, y: y, z: z},
      {x: 0, y: Sierpinski.parallaxAngle/2, z: 0}
    );
  }

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    ctx.clearRect(0, 0, width, height);
    const thetaX = Sierpinski.rotationPerDelta * e.deltaY;
    const thetaY = Sierpinski.rotationPerDelta * e.deltaX;

    tree1.draw(ctx, side, {x: x1, y: y, z: z}, {x: thetaX, y: thetaY, z: 0});
    tree2 && tree2.draw(ctx, side, {x: x2, y: y, z: z}, {x: thetaX, y: thetaY, z: 0});
  });
}


class SierpinskiTree {
  constructor() {
    this.root       = new SierpinskiTreeNode();
    this.root.tree  = this;
    this.rotation   = {x: -Math.PI, y: Math.PI, z: 0};
  }

  draw(ctx, side, pyramidCentre, rotation) {
    this.rotation.x += rotation.x;
    this.rotation.y += rotation.y;
    this.rotation.z += rotation.z;
    this.root.draw(ctx, side, pyramidCentre, pyramidCentre, this.rotation);
  }
}


class SierpinskiTreeNode {
  constructor(parent) {
    this.parent     = parent;
    this.tree       = this.parent ? this.parent.tree : null;
    this.depth      = this.parent ? this.parent.depth + 1 : 0;
    this.childNodes = [];
  }

  draw(ctx, side, pyramidCentre, rotationCentre, rotation) {
    if (side > Sierpinski.minSide) {
      const pyramid = new Pyramid(side/2, pyramidCentre);
      this.reproduce();
      this.childNodes.forEach((c, i) => c.draw(ctx, side/2, pyramid.vectors[i], rotationCentre, rotation));
    } else {
      this.removeChildren();
      new Pyramid(side, pyramidCentre).moveCentreTo(rotationCentre).rotate(rotation).draw(ctx);
    }
  }

  reproduce() {
    if (!this.childNodes.length) {
      this.childNodes = [0, 1, 2, 3].map(i => new SierpinskiTreeNode(this));
    }
  }

  removeChildren() {
    this.childNodes.forEach(c => c.removeChildren());
    this.childNodes = [];
  }
}


class Pyramid {
  constructor(side, centre) {
    const p1 = side * Sierpinski.perpendicularFactor;
    const p2 = side / Sierpinski.sqrtOf2 - p1;

    this.vectors = [
      [ centre.x - side/2, centre.y - p1, centre.z - p1 ],
      [ centre.x + side/2, centre.y - p1, centre.z - p1 ],
      [ centre.x, centre.y - p1, centre.z + p2 ],
      [ centre.x, centre.y + p2, centre.z ]
    ].map(arrow => new Vector([centre.x, centre.y, centre.z], arrow));
  }

  moveCentreTo(newCentre) {
    this.vectors.forEach(v => v.moveCentreTo([newCentre.x, newCentre.y, newCentre.z]));
    return this;
  }

  rotate(rotation) {
    this.vectors.forEach(v => v.rotate(rotation));
    return this;
  }

  draw(ctx) {
    this.vectors.forEach((v, i, arr) => {
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(arr[(i+1) % 4].x, arr[(i+1) % 4].y);
      ctx.lineTo(arr[(i+2) % 4].x, arr[(i+2) % 4].y);
      ctx.lineTo(v.x, v.y);
      ctx.fill();
    });
    return this;
  }
}


class Vector {
  constructor(centre, arrow) {
    this.centre = centre;
    this.arrow  = arrow;
  }

  get x() {
    return this.arrow[0];
  }

  get y() {
    return this.arrow[1];
  }

  get z() {
    return this.arrow[2];
  }

  moveCentreTo(newCentre) {
    this.centre = newCentre;
    return this;
  }

  rotate(rotation) {
    [rotation.x, rotation.y, rotation.z].forEach((theta, i) => {
      const dimension = ((theta, a, b) => {
        const s = Math.sin(theta);
        const c = Math.cos(theta);
        return [a*c - b*s, a*s + b*c];
      })(theta, this.arrow[(i + 1) % 3] - this.centre[(i + 1) % 3], this.arrow[(i + 2) % 3] - this.centre[(i + 2) % 3]);
      this.arrow[(i + 1) % 3] = this.centre[(i + 1) % 3] + dimension[0];
      this.arrow[(i + 2) % 3] = this.centre[(i + 2) % 3] + dimension[1];
    });
    return this;
  }
}
