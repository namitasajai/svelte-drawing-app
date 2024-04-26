<script>
  import { onMount } from "svelte";
  let canvas, ctx;
  let drawing = false;
  let strokeColor = "#000000";
  let lineWidth = 3;
  let brushType = "source-over"; // Default brush type
  let states = [];
  let currentStateIndex = -1;

  onMount(() => {
    ctx = canvas.getContext("2d");
    // ctx.fillStyle = "clear"; // Initially set the canvas background to white
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    states.push(canvas.toDataURL());
    currentStateIndex++;
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);
  });

  function saveState() {
    while (states.length > currentStateIndex + 1) {
      states.pop(); // Remove future states when new lines are drawn after undo
    }
    states.push(canvas.toDataURL());
    currentStateIndex++;
  }

  function undo() {
    if (currentStateIndex > 0) {
      currentStateIndex--;
      let img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = states[currentStateIndex];
    }
  }

  function redo() {
    if (currentStateIndex < states.length - 1) {
      currentStateIndex++;
      let img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = states[currentStateIndex];
    }
  }

  function startDrawing(event) {
    drawing = true;
    ctx.globalCompositeOperation = brushType;
    ctx.beginPath();
    ctx.moveTo(
      event.clientX - canvas.offsetLeft,
      event.clientY - canvas.offsetTop
    );
  }

  function draw(event) {
    if (!drawing) return;
    ctx.lineTo(
      event.clientX - canvas.offsetLeft,
      event.clientY - canvas.offsetTop
    );
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function stopDrawing() {
    if (drawing) {
      drawing = false;
      ctx.closePath();
      saveState();
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = "clear"; 
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  }

  function changeBrush(type) {
    brushType = type;
    strokeColor = type === "eraser" ? "white" : "#000000";
  }
</script>

<div class="app-container">
  <canvas bind:this={canvas} width="550" height="500"></canvas>

  <div class="tools">
    <select bind:value={brushType} on:change={() => changeBrush(brushType)}>
      <option value="source-over">Pencil</option>
      <option value="destination-out">Eraser</option>
    </select>
    <input
      type="color"
      bind:value={strokeColor}
      disabled={brushType === "eraser"}
    />
    <input type="range" min="1" max="10" bind:value={lineWidth} />
    <button on:click={clearCanvas}>Clear All</button>
    <button on:click={undo}>Undo</button>
    <button on:click={redo}>Redo</button>
  </div>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
    background-image: url("/paint.png");
    background-repeat: no-repeat; /* Prevents the image from repeating */
    background-position: center;
    background-size: cover;
    font-family: "Arial", sans-serif;
  }

  canvas {
    /* border: 2px solid #ccc;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); */
    margin-top: 20px;
  }

  select,
  input,
  button {
    padding: 8px 12px;
    margin: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
  }

  select:hover,
  input:hover,
  button:hover {
    border-color: #888;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  button {
    background-color: #ff85c0;
    color: white;
    cursor: pointer;
  }

  button:disabled {
    background-color: #ccc;
    color: #666;
    cursor: not-allowed;
  }

  input[type="color"] {
    padding: 0;
    width: 40px;
    height: 40px;
    border: none;
  }

  input[type="range"] {
    width: 200px;
  }
</style>
