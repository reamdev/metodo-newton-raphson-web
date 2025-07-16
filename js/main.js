// Configuración de MathQuill
const MQ = MathQuill.getInterface(2);
const functionField = MQ.MathField(document.getElementById("function-field"));

// Variables globales
let newtonChart = null;
let iterationsData = [];
let derivative = "";

// Función principal
function runNewton() {
  reset();

  // Calcular derivada exacta
  const func = cleanLatexExpression(functionField.latex());
  if (func.trim() === "") {
    document.getElementById("derivative-text").textContent = "";
    alert("Ingrese una funcion");
    return;
  }

  derivative = calculateExactDerivative(func);
  console.log(derivative);

  const latexCont = document.getElementById("derivative-text");
  if (derivative == "No se pudo calcular la derivada") {
    latexCont.textContent = derivative;
  } else {
    latexCont.textContent = `\\( ${formatDerivative(derivative)} \\)`;
  }
  runMathRender(latexCont);

  // Configurar rangos del gráfico
  const x0 = parseFloat(document.getElementById("x0").value);
  const tolerancia = parseFloat(document.getElementById("tolerancia").value);
  const xMin = x0 - 3;
  const xMax = x0 + 3;

  // Ejecutar iteraciones
  let i = 0;
  let errorExecution = false;
  while (true) {
    const lastX =
      iterationsData.length > 0
        ? iterationsData[iterationsData.length - 1].xn
        : x0;
    const fx = evaluateFunction(func, lastX);
    const dfx = evaluateFunction(derivative, lastX);

    // Evitar división por cero
    if (Math.abs(dfx) < 1e-10) {
      alert("Derivada cercana a cero encontrada. Deteniendo las iteraciones.");
      break;
    }

    const xn = lastX - fx / dfx;
    const error = Math.abs(xn - lastX);

    iterationsData.push({
      n: iterationsData.length + 1,
      xn: xn,
      fxn: fx,
      dfxn: dfx,
      error: error,
    });

    if (Math.abs(xn - lastX) < tolerancia) {
      break;
    }

    if (i >= 10000) {
      errorExecution = true;
      alert("Hubo un error");
      break;
    }

    i++;
  }

  if (!errorExecution) {
    updateIterationsDisplay();
    updateChart(xMin, xMax);
  }
}

// Limpiar expresión LaTeX para nerdamer
function cleanLatexExpression(latex) {
  return latex
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, "($1)/($2)") // Fracciones
    .replace(/\\sqrt{([^}]+)}/g, "sqrt($1)") // Raíces
    .replace(/\\pi/g, "pi") // Pi
    .replace(/\^/g, "^") // Potencias
    .replace(/\s+/g, "") // Eliminar espacios
    .replace(/\*?\\cdot\*?/g, "*") // Puntos de multiplicación
    .replace(/([0-9])([a-zA-Z])/g, "$1*$2") // 3x → 3*x
    .replace(/([a-zA-Z])([0-9])/g, "$1*$2") // x3 → x*3
    .replace(/([)])([a-zA-Z])/g, "$1*$2") // )(x → )*(x
    .replace(/([0-9)])([(])/g, "$1*$2"); // 3( → 3*(
}

// Calcular derivada exacta usando nerdamer
function calculateExactDerivative(expr) {
  try {
    // Calcular la derivada
    const derivativeExpr = nerdamer(`diff(${expr}, x)`);

    // Convertir a texto y limpiar
    return derivativeExpr.toString();
  } catch (e) {
    console.error("Error calculando derivada:", e);
    return "No se pudo calcular la derivada";
  }
}

// Formatear la derivada para mejor visualización
function formatDerivative(derivative) {
  return derivative
    .replace(/\*/g, "") // Eliminar * para visualización
    .replace(/\^1\b/g, "") // Eliminar ^1
    .replace(/\+\-/g, "-") // Corregir +-
    .replace(/\b1x\b/g, "x") // 1x → x
    .replace(/\b0\+/g, "") // Eliminar términos 0+
    .replace(/\b0\-/g, "-") // 0- → -
    .replace(/\+0/g, ""); // Eliminar +0
}

// Evaluar función en un punto
function evaluateFunction(expression, x) {
  try {
    // Reemplazar x por el valor y evaluar con math.js
    const expr = expression.replace(/x/g, `(${x})`);
    return math.evaluate(expr);
  } catch (e) {
    console.error("Error al evaluar:", e);
    return NaN;
  }
}

// Actualizar la visualización de iteraciones
function updateIterationsDisplay() {
  const tableContainer = document.querySelector("#iteracciones-table tbody");
  tableContainer.innerHTML = "";

  iterationsData.forEach((iter) => {
    tableContainer.innerHTML += `
      <tr>
        <td class="text-center border py-2">${iter.n}</td>
        <td class="border py-2">${iter.xn.toFixed(6)}</td>
        <td class="border py-2">${iter.fxn.toFixed(6)}</td>
        <td class="border py-2">${iter.dfxn.toFixed(6)}</td>
        <td class="border py-2">${iter.error.toFixed(6)}</td>
      </tr>
    `;
  });
}

// Actualizar el gráfico
function updateChart(xMin, xMax) {
  const func = cleanLatexExpression(functionField.latex());
  const points = 200;

  // Datos de la función
  const functionData = [];
  const step = (xMax - xMin) / points;
  for (let x = xMin; x <= xMax; x += step) {
    const y = evaluateFunction(func, x);
    if (!isNaN(y)) {
      functionData.push({ x, y });
    }
  }

  // Datos de los puntos de iteración
  const iterationPoints = iterationsData.map((iter) => ({
    x: iter.xn,
    y: iter.fxn,
  }));

  // Configurar el gráfico
  const ctx = document.getElementById("newton-chart").getContext("2d");

  if (newtonChart) {
    newtonChart.destroy();
  }

  newtonChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "f(x)",
          data: functionData,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          pointRadius: 0,
          showLine: true,
          borderWidth: 2,
        },
        {
          label: "Puntos de iteración",
          data: iterationPoints,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgb(255, 99, 132)",
          pointRadius: 6,
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          position: "center",
          min: xMin,
          max: xMax,
          title: {
            display: true,
            text: "x",
          },
        },
        y: {
          type: "linear",
          position: "center",
          title: {
            display: true,
            text: "f(x)",
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: (${context.parsed.x.toFixed(
                2
              )}, ${context.parsed.y.toFixed(2)})`;
            },
          },
        },
      },
    },
  });
}

// Reiniciar todo
function reset() {
  iterationsData = [];
  derivative = "";
  document.getElementById("derivative-text").textContent = "Sin Calcular";
  document.getElementById("derivative-text");
  document.querySelector("#iteracciones-table tbody").innerHTML = `
    <tr>
      <td colspan="5" class="text-center border py-2">Sin datos</td>
    </tr>
  `;

  if (newtonChart) {
    newtonChart.destroy();
    newtonChart = null;
  }
}

// Inicialización
window.addEventListener("load", function () {
  // Mostrar derivada inicial
  updateDerivative();

  // Actualizar derivada cuando cambia la función
  functionField.el().addEventListener("input", updateDerivative);
});

function updateDerivative() {
  const func = cleanLatexExpression(functionField.latex());
  derivative = calculateExactDerivative(func);
  const latexCont = document.getElementById("derivative-text");
  if (derivative == "-") {
    latexCont.textContent = derivative;
  } else {
    latexCont.textContent = `\\( ${formatDerivative(derivative)} \\)`;
  }
  runMathRender(latexCont);
}

function runMathRender(container) {
  renderMathInElement(container, {
    delimiters: [
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true },
    ],
  });
}

let visible = false;
document.getElementById("btn-teclado").addEventListener("click", () => {
  const teclado = document.getElementById("teclado-flotante");
  if (visible) {
    teclado.style.display = "none";
  } else {
    teclado.style.display = "block";
  }
  visible = !visible;
});

function insertar(tipo) {
  const lastLatex = functionField.latex();
  const lastChar = lastLatex.trim().slice(-1);

  switch (tipo) {
    case "sqrt":
      functionField.cmd("\\sqrt");
      break;
    case "^":
      if (
        lastLatex === "" ||
        ["+", "-", "*", "/", "^", "(", "="].includes(lastChar)
      ) {
        functionField.write("x");
        functionField.keystroke("Right");
        functionField.keystroke("^");
      } else {
        functionField.cmd("^");
      }
      break;
    case "frac":
      functionField.cmd("\\frac");
      break;
    case "pi":
      functionField.cmd("\\pi");
      break;
    case "e":
      functionField.write("e");
      break;
    case "sin":
    case "cos":
    case "tan":
      functionField.cmd(`\\${tipo}`);
      functionField.write("()");
      functionField.keystroke("Left");
      break;
    case "(":
    case ")":
    case "+":
    case "-":
    case "*":
    case "/":
      functionField.write(tipo);
      break;
  }
  functionField.focus();
}

const btnToggle = document.getElementById("toggle-iteracciones");
const colIteracciones = document.getElementById("col-iteracciones");

let visibleColumn = true;

btnToggle.addEventListener("click", () => {
  visibleColumn = !visibleColumn;
  colIteracciones.classList.toggle("hidden", !visibleColumn);
  btnToggle.textContent = visibleColumn
    ? "Ocultar Iteraciones"
    : "Mostrar Iteraciones";

  setTimeout(() => {
    const canvas = document.getElementById("newton-chart");

    // 👇 Forzar el navegador a recalcular layout
    canvas.style.display = "none";
    canvas.offsetHeight; // ← Forzar reflow
    canvas.style.display = "block";

    if (newtonChart) {
      newtonChart.resize();
    }
  }, 350); // Empareja con el transition-all (300ms)
});

// Cambiar el tema al hacer toggle
const toggle = document.getElementById("theme-toggle");
toggle.addEventListener("change", () => {
  document.documentElement.classList.toggle("dark");

  // ⚠️ Redibujar el gráfico con el nuevo tema
  if (newtonChart) {
    updateChart(
      parseFloat(document.getElementById("x0").value) - 3,
      parseFloat(document.getElementById("x0").value) + 3
    );
  }
});