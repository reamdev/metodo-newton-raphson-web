from flask import Flask, render_template, request, jsonify
from sympy import symbols, diff, latex, sympify, latex

app = Flask(__name__)

@app.route('/')
def home():
  return render_template('index.html')  # Carga el HTML principal

@app.route('/derivar', methods=['POST'])
def derivar():
  data = request.json
  funcion_latex = data.get('funcion')

  try:
    x = symbols('x')
    funcion = sympify(funcion_latex)
    derivada = diff(funcion, x)
    return jsonify({
      'derivada': latex(derivada)
    })
  except Exception as e:
    return jsonify({'error': str(e)}), 400

@app.route("/calcular", methods=["POST"])
def calcular():
  data = request.get_json()

  funcion_str = data.get("funcion", "")
  x0 = float(data.get("x0", 0))
  tolerancia = float(data.get("tolerancia", 0.001))

  x = symbols('x')
  try:
    # Convertir texto a expresión simbólica
    funcion = sympify(funcion_str)
    derivada = diff(funcion, x)
    derivada_latex = latex(derivada)
    print(derivada_latex)

    # Método de Newton-Raphson
    iteraciones = []
    i = 0
    while(True):
      f_val = funcion.subs(x, x0)
      f_deriv = derivada.subs(x, x0)
      if f_deriv == 0:
        break  # evitar división entre cero

      x1 = x0 - f_val / f_deriv
      error = abs(x1 - x0)

      iteraciones.append({
        "n": i + 1,
        "xn": round(float(x0),6),
        "fxn": round(float(f_val),6),
        "dfxn": round(float(f_deriv),6),
        "error": round(float(error),6)
      })

      if error < tolerancia:
        break
      x0 = x1
      i += 1
      if (i > 10000):
        raise Exception("Demasiadas Iteraciones, limite 10000")

    return jsonify({
      "derivada": str(derivada_latex),
      "iteraciones": iteraciones
    })
  except Exception as e:
    return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
  app.run(debug=True)
