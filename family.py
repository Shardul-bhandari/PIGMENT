def check_family_eligibility(members, incomes, area):
    total_members = len(members)
    total_income = sum(incomes)

    if total_members >= 3 and total_income > 50000:
        return f"Eligible ✅ | Members: {total_members}, Income: {total_income}, Area: {area}"
    else:
        return f"Not Eligible ❌ | Members: {total_members}, Income: {total_income}, Area: {area}"