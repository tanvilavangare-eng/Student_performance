
import streamlit as st
import joblib
import pandas as pd

st.set_page_config(
    page_title="AI Student Performance Prediction",
    page_icon="🎓",
    layout="centered"
)

@st.cache_resource
def load_model():
    return joblib.load("model.pkl")

st.title("🎓 AI-Based Student Performance Prediction System")
st.write("Enter student details to predict academic performance.")

try:
    M = load_model()
except Exception as e:
    st.error("Unable to load model.pkl. Check that it exists in your GitHub repository.")
    st.stop()

with st.form("prediction_form"):
    name = st.text_input("Student Name")
    student_id = st.text_input("Student ID")
    course = st.text_input("Course", value="BSc IT")

    attendance = st.slider("Attendance (%)", 0, 100, 75)
    internal = st.slider("Internal Marks", 0, 100, 60)
    assignment = st.slider("Assignment Marks", 0, 100, 60)
    previous = st.slider("Previous Exam Marks", 0, 100, 55)
    study_hours = st.slider("Study Hours per Day", 0.0, 12.0, 2.0, 0.5)

    submitted = st.form_submit_button("Predict Performance")

if submitted:
    data = {
        "attendance": attendance,
        "internal": internal,
        "assignment": assignment,
        "previous": previous,
        "study_hours": study_hours
    }

    try:
        row = pd.DataFrame([{
            "attendance": attendance,
            "internal": internal,
            "assignment": assignment,
            "previous": previous,
            "study_hours": study_hours
        }])[M["features"]]

        score = float(M["reg"].predict(row)[0])
        probability = float(M["clf"].predict_proba(row)[0][1]) * 100

        category = (
            "Excellent" if score >= 80 else
            "Good" if score >= 65 else
            "Average" if score >= 50 else
            "Needs Improvement"
        )

        risk = (
            "Low" if probability >= 80 else
            "Medium" if probability >= 50 else
            "High"
        )

        st.subheader("📊 Prediction Results")
        st.metric("Predicted Marks", f"{round(score)}/100")
        st.metric("Probability of Passing", f"{round(probability)}%")
        st.write("**Performance Category:**", category)
        st.write("**Academic Risk:**", risk)
        st.write("**Student:**", name or "Not provided")
        st.write("**Student ID:**", student_id or "Not provided")
        st.write("**Course:**", course or "Not provided")

        st.subheader("💡 Recommendations")
        tips = []
        if attendance < 75:
            tips.append("Improve attendance to at least 75%.")
        if internal < 60:
            tips.append("Revise topics covered in internal tests.")
        if assignment < 60:
            tips.append("Complete assignments on time.")
        if previous < 55:
            tips.append("Revise weak topics from previous examinations.")
        if study_hours < 2:
            tips.append("Try to study at least 2 hours daily.")

        if tips:
            for tip in tips:
                st.write("•", tip)
        else:
            st.success("Keep up the good work and maintain consistent study habits.")

    except Exception as e:
        st.error(f"Prediction failed: {e}")
