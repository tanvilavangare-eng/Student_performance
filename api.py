"""Flask API with SQLite database. Run: python api.py  (train first: python train.py)"""
import sqlite3

import joblib
import pandas as pd
from flask import Flask, jsonify, request

app = Flask(__name__)
M = joblib.load("model.pkl")
DB = "students.db"

# JSON key used by the website -> database column
COLS = {"at": "attendance", "im": "internal_marks", "am": "assignment_marks",
        "pm": "previous_marks", "sh": "study_hours"}


def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


with db() as c:
    c.execute("""CREATE TABLE IF NOT EXISTS students(
        id TEXT PRIMARY KEY, name TEXT NOT NULL, course TEXT, age INTEGER,
        attendance REAL, internal_marks REAL, assignment_marks REAL,
        previous_marks REAL, study_hours REAL,
        score INTEGER, result TEXT, pass_prob INTEGER, cat TEXT, risk TEXT,
        updated TEXT DEFAULT CURRENT_TIMESTAMP)""")


@app.after_request
def cors(r):
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type"
    r.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return r


def run_model(d):
    row = pd.DataFrame([{"attendance": d["at"], "internal": d["im"], "assignment": d["am"],
                         "previous": d["pm"], "study_hours": d["sh"]}])[M["features"]]
    marks = float(M["reg"].predict(row)[0])
    p_pass = float(M["clf"].predict_proba(row)[0][1])
    cat = ("Excellent" if marks >= 80 else "Good" if marks >= 65
           else "Average" if marks >= 50 else "Needs improvement")
    risk = "Low" if p_pass >= 0.8 else "Medium" if p_pass >= 0.5 else "High"
    tips = []
    if d["at"] < 75: tips.append("Raise attendance above 75%.")
    if d["im"] < 60: tips.append("Revise topics from internal tests.")
    if d["am"] < 60: tips.append("Submit assignments on time and complete all of them.")
    if d["pm"] < 55: tips.append("Revisit weak topics from the previous exam.")
    if d["sh"] < 2: tips.append("Study at least 2 hours per day.")
    if not tips: tips.append("Maintain regular attendance and keep submitting assignments on time.")
    return {"score": round(marks), "result": "Pass" if p_pass >= 0.5 else "Fail",
            "pass_prob": round(p_pass * 100), "cat": cat, "risk": risk, "tips": tips}


def to_json(r):
    d = {"id": r["id"], "name": r["name"], "course": r["course"], "age": r["age"]}
    for k, col in COLS.items():
        d[k] = r[col]
    d["p"] = {"score": r["score"], "result": r["result"], "pass_prob": r["pass_prob"],
              "cat": r["cat"], "risk": r["risk"]}
    return d


def write(d, new):
    p = run_model(d)
    vals = [d.get("name"), d.get("course", ""), d.get("age", 0)] + [d[k] for k in COLS] + \
           [p["score"], p["result"], p["pass_prob"], p["cat"], p["risk"]]
    with db() as c:
        if new:
            c.execute("INSERT INTO students(id,name,course,age,attendance,internal_marks,"
                      "assignment_marks,previous_marks,study_hours,score,result,pass_prob,cat,risk)"
                      " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [d["id"]] + vals)
        else:
            c.execute("UPDATE students SET name=?,course=?,age=?,attendance=?,internal_marks=?,"
                      "assignment_marks=?,previous_marks=?,study_hours=?,score=?,result=?,"
                      "pass_prob=?,cat=?,risk=?,updated=CURRENT_TIMESTAMP WHERE id=?", vals + [d["id"]])


@app.get("/students")
def list_students():
    with db() as c:
        return jsonify([to_json(r) for r in c.execute("SELECT * FROM students ORDER BY id")])


@app.post("/students")
def add_student():
    d = request.get_json()
    try:
        write(d, new=True)
    except sqlite3.IntegrityError:
        return jsonify({"error": "ID %s already exists. Use Update details instead." % d["id"]}), 409
    return jsonify({"ok": True}), 201


@app.put("/students/<sid>")
def update_student(sid):
    d = request.get_json()
    d["id"] = sid
    with db() as c:
        if not c.execute("SELECT 1 FROM students WHERE id=?", [sid]).fetchone():
            return jsonify({"error": "No student with ID %s. Use Save student to add one." % sid}), 404
    write(d, new=False)
    return jsonify({"ok": True})


@app.delete("/students/<sid>")
def delete_student(sid):
    with db() as c:
        c.execute("DELETE FROM students WHERE id=?", [sid])
    return jsonify({"ok": True})


@app.post("/predict")
def predict():
    d = request.get_json()
    p = run_model(d)
    if d.get("id"):  # save the prediction against that student
        with db() as c:
            c.execute("UPDATE students SET score=?,result=?,pass_prob=?,cat=?,risk=? WHERE id=?",
                      [p["score"], p["result"], p["pass_prob"], p["cat"], p["risk"], d["id"]])
    return jsonify(p)


if __name__ == "__main__":
    app.run(port=5000, debug=True)