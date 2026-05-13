from flask import Flask, render_template, request
from family import check_family_eligibility

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def home():
    result = ""

    if request.method == 'POST':
        # Get data from form
        names = request.form.getlist('name')
        incomes = request.form.getlist('income')
        area = request.form['area']

        # Convert income to int
        incomes = [int(i) for i in incomes if i]

        result = check_family_eligibility(names, incomes, area)

    return render_template('index.html', result=result)

if __name__ == '__main__':
    app.run(debug=True)