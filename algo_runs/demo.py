import logging

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

def calculate_average(scores):
    if not scores:
        raise ValueError("Score list cannot be empty.")
    
    total = 0
    for score in scores:
        total = total + score
        
    average = total / len(scores)
    return average

def assign_grade(score):
    logging.info(f"Evaluating score: {score}")
    if score >= 80:
        return "A"
    elif score >= 60:
        return "B"
    elif score >= 40:
        return "C"
    else:
        return "Fail"

def main(): 
    student_name = "Arjun"
    passing_mark = 40
    is_enrolled = True
    exam_scores = [85, 62, 35, 90]

    print("Student:", student_name)
    print("Enrolled:", is_enrolled)
    print("-" * 25)

    for index, current_score in enumerate(exam_scores):
        grade = assign_grade(current_score)
        print(f"Exam {index + 1}: Score = {current_score} | Grade = {grade}")

    print("-" * 25)

    try:
        avg = calculate_average(exam_scores)
        print("Average Score:", avg)
        
        if avg >= passing_mark:
            print("Final Status: PASSED")
        else:
            print("Final Status: FAILED")
    except ValueError as err:
        logging.error(f"Calculation error: {err}")

    print("-" * 25)

    countdown = 3
    while countdown > 0:
        logging.info(f"Closing session in {countdown}...")
        countdown = countdown - 1
    print("Done.")

if __name__ == "__main__":
    main()