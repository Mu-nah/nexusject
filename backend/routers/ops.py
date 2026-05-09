from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.ops import (
    HrContractDocument,
    HrDbsRecord,
    HrLeaveRequest,
    HrPerformanceReview,
    HrRightToWorkRecord,
    Trustee,
    UkviCosRecord,
    UkviDuty,
    UkviWorker,
    Volunteer,
    VolunteerAgreement,
    VolunteerHour,
)
from backend.models.employee import Employee
from backend.models.user import User

router = APIRouter(prefix="/ops", tags=["Operations"])


def _seed_volunteers(db: Session, org_id: int) -> None:
    if db.query(Volunteer).filter(Volunteer.organisation_id == org_id).count():
        return
    db.add_all(
        [
            Volunteer(organisation_id=org_id, name="Sarah Adebayo", role="Youth Mentor", programme="Youth Connect", hours="8h/wk", dbs="Enhanced", status="Active"),
            Volunteer(organisation_id=org_id, name="Michael Osei", role="Skills Trainer", programme="Skills Hub", hours="4h/wk", dbs="Enhanced", status="Active"),
            Volunteer(organisation_id=org_id, name="Fatima Al-Hassan", role="Admin Support", programme="Core Ops", hours="6h/wk", dbs="Basic", status="Active"),
            Volunteer(organisation_id=org_id, name="Peter Nwosu", role="Event Support", programme="Community", hours="2h/wk", dbs="Enhanced", status="Inactive"),
        ]
    )
    db.add_all(
        [
            VolunteerHour(organisation_id=org_id, volunteer_name="Sarah Adebayo", week="W/E 15 Mar", logged="8.5h", approved="8.5h", value="GBP 97.75", status="Approved"),
            VolunteerHour(organisation_id=org_id, volunteer_name="Michael Osei", week="W/E 15 Mar", logged="4.0h", approved="4.0h", value="GBP 46.00", status="Approved"),
            VolunteerHour(organisation_id=org_id, volunteer_name="Fatima Al-Hassan", week="W/E 15 Mar", logged="6.0h", approved="-", value="GBP 69.00", status="Pending"),
            VolunteerHour(organisation_id=org_id, volunteer_name="Sarah Adebayo", week="W/E 08 Mar", logged="8.0h", approved="8.0h", value="GBP 92.00", status="Approved"),
        ]
    )
    db.add_all(
        [
            VolunteerAgreement(organisation_id=org_id, name="Sarah Adebayo", issued="01 Sep 2023", signed="03 Sep 2023", expires="Sep 2025", status="Active"),
            VolunteerAgreement(organisation_id=org_id, name="Michael Osei", issued="01 Jan 2024", signed="05 Jan 2024", expires="Jan 2026", status="Active"),
            VolunteerAgreement(organisation_id=org_id, name="Fatima Al-Hassan", issued="01 Jun 2023", signed="08 Jun 2023", expires="Jun 2025", status="Due Renewal"),
            VolunteerAgreement(organisation_id=org_id, name="Peter Nwosu", issued="01 Mar 2023", signed="02 Mar 2023", expires="Mar 2025", status="Expired"),
        ]
    )
    db.commit()


def _seed_governance(db: Session, org_id: int) -> None:
    if db.query(Trustee).filter(Trustee.organisation_id == org_id).count():
        return
    db.add_all(
        [
            Trustee(organisation_id=org_id, name="Dominic Ogbuagu", role="Director / CFO", appointed="01 Apr 2022", status="Active", coi="None declared"),
            Trustee(organisation_id=org_id, name="Grace Okafor", role="Chair", appointed="01 Apr 2022", status="Active", coi="None declared"),
            Trustee(organisation_id=org_id, name="Ahmed Al-Rashid", role="Secretary", appointed="15 Jun 2022", status="Active", coi="None declared"),
        ]
    )
    db.commit()


def _seed_ukvi(db: Session, org_id: int) -> None:
    if db.query(UkviWorker).filter(UkviWorker.organisation_id == org_id).count():
        return
    db.add(UkviWorker(organisation_id=org_id, name="Kwame Okafor", role="Community Worker / 3229", cos="CoS-2023-0041", start_date="01 Jun 2023", visa_expiry="31 Dec 2026", rtw="Due Soon", status="Active"))
    db.add_all(
        [
            UkviCosRecord(organisation_id=org_id, cos_ref="CoS-2023-0041", worker="Kwame Okafor", type="Defined", issued="15 May 2023", status="Used"),
            UkviCosRecord(organisation_id=org_id, cos_ref="CoS-2024-0012", worker="Unassigned", type="Undefined", issued="-", status="Available"),
        ]
    )
    db.add_all(
        [
            UkviDuty(organisation_id=org_id, duty="RTW Check Renewal", trigger="J. Musa BRP expired", deadline="Immediate", status="Overdue", latest_note="Awaiting updated documentation."),
            UkviDuty(organisation_id=org_id, duty="Absence Report", trigger="K. Okafor - 11 consecutive days", deadline="Within 10 working days", status="Due", latest_note="Follow-up in progress."),
            UkviDuty(organisation_id=org_id, duty="Annual Confirmation of Accuracy", trigger="Annual requirement", deadline="Jun 2025", status="Upcoming", latest_note="Next annual declaration pending."),
        ]
    )
    db.commit()


def _seed_hr(db: Session, org_id: int) -> None:
    if not db.query(Employee).filter(Employee.organisation_id == org_id).count():
        db.add_all(
            [
                Employee(organisation_id=org_id, employee_number="EMP-0001", full_name="Dominic Ogbuagu", role_title="CFO / Director", contract_type="full_time", gross_salary=1800, is_active=True),
                Employee(organisation_id=org_id, employee_number="EMP-0002", full_name="Aisha Ibrahim", role_title="Programme Manager", contract_type="full_time", gross_salary=1600, is_active=True),
                Employee(organisation_id=org_id, employee_number="EMP-0003", full_name="Kwame Okafor", role_title="Community Worker", contract_type="part_time", gross_salary=1200, is_active=True),
                Employee(organisation_id=org_id, employee_number="EMP-0004", full_name="Jamilu Musa", role_title="Finance Assistant", contract_type="part_time", gross_salary=950, is_active=True),
            ]
        )

    if not db.query(HrRightToWorkRecord).filter(HrRightToWorkRecord.organisation_id == org_id).count():
        db.add_all(
            [
                HrRightToWorkRecord(organisation_id=org_id, name="Dominic Ogbuagu", doc_type="British Passport", checked="01 Sep 2022", expires="N/A", status="Valid"),
                HrRightToWorkRecord(organisation_id=org_id, name="Aisha Ibrahim", doc_type="British Passport", checked="01 Mar 2023", expires="N/A", status="Valid"),
                HrRightToWorkRecord(organisation_id=org_id, name="Kwame Okafor", doc_type="BRP Card", checked="01 Jun 2023", expires="31 Dec 2026", status="Due Soon"),
                HrRightToWorkRecord(organisation_id=org_id, name="Jamilu Musa", doc_type="BRP Card", checked="01 Jan 2023", expires="01 Jan 2025", status="Expired"),
            ]
        )

    if not db.query(HrDbsRecord).filter(HrDbsRecord.organisation_id == org_id).count():
        db.add_all(
            [
                HrDbsRecord(organisation_id=org_id, name="Dominic Ogbuagu", level="Enhanced", issued="01 Sep 2022", renewal="Sep 2025", status="Valid"),
                HrDbsRecord(organisation_id=org_id, name="Aisha Ibrahim", level="Enhanced", issued="01 Mar 2023", renewal="Mar 2026", status="Valid"),
                HrDbsRecord(organisation_id=org_id, name="Kwame Okafor", level="Enhanced", issued="01 Jun 2022", renewal="Jun 2025", status="Due Soon"),
                HrDbsRecord(organisation_id=org_id, name="Jamilu Musa", level="Basic", issued="01 Jan 2023", renewal="Jan 2026", status="Valid"),
            ]
        )

    if not db.query(HrLeaveRequest).filter(HrLeaveRequest.organisation_id == org_id).count():
        db.add_all(
            [
                HrLeaveRequest(organisation_id=org_id, name="Kwame Okafor", leave_type="Annual Leave", date_from="28 Apr", date_to="02 May", days="5", status="Pending"),
                HrLeaveRequest(organisation_id=org_id, name="Aisha Ibrahim", leave_type="Annual Leave", date_from="14 Apr", date_to="17 Apr", days="4", status="Approved"),
            ]
        )

    if not db.query(HrPerformanceReview).filter(HrPerformanceReview.organisation_id == org_id).count():
        db.add_all(
            [
                HrPerformanceReview(organisation_id=org_id, name="Aisha Ibrahim", reviewer="D. Ogbuagu", review_type="Quarterly", due="30 Apr 2025", status="Scheduled"),
                HrPerformanceReview(organisation_id=org_id, name="Kwame Okafor", reviewer="A. Ibrahim", review_type="Probation", due="15 May 2025", status="Scheduled"),
                HrPerformanceReview(organisation_id=org_id, name="Jamilu Musa", reviewer="D. Ogbuagu", review_type="Annual", due="01 Feb 2025", status="Completed"),
            ]
        )

    if not db.query(HrContractDocument).filter(HrContractDocument.organisation_id == org_id).count():
        db.add_all(
            [
                HrContractDocument(organisation_id=org_id, name="Dominic Ogbuagu", doc_type="Employment Contract", issued="01 Apr 2022", expires="Permanent", status="Active"),
                HrContractDocument(organisation_id=org_id, name="Aisha Ibrahim", doc_type="Employment Contract", issued="01 Mar 2023", expires="Permanent", status="Active"),
                HrContractDocument(organisation_id=org_id, name="Kwame Okafor", doc_type="Fixed Term Contract", issued="01 Jun 2023", expires="31 May 2025", status="Due"),
            ]
        )

    db.commit()


class VolunteerPayload(BaseModel):
    name: str
    role: str
    programme: str
    hours: str
    dbs: str
    status: str


class VolunteerHourPayload(BaseModel):
    volunteer_name: str
    week: str
    logged: str
    approved: str = "-"
    value: str
    status: str


class TrusteePayload(BaseModel):
    name: str
    role: str
    appointed: str
    status: str
    coi: str = ""


class UkviWorkerPayload(BaseModel):
    name: str
    role: str
    cos: str
    start_date: str
    visa_expiry: str
    rtw: str
    status: str


class UkviCosPayload(BaseModel):
    cos_ref: str
    worker: str
    type: str
    issued: str
    status: str


class HrLeavePayload(BaseModel):
    name: str
    leave_type: str
    date_from: str
    date_to: str
    days: str
    status: str


class HrReviewPayload(BaseModel):
    name: str
    reviewer: str
    review_type: str
    due: str
    status: str


class HrContractPayload(BaseModel):
    name: str
    doc_type: str
    issued: str
    expires: str
    status: str


@router.get("/volunteers")
async def get_volunteers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organisation_id
    _seed_volunteers(db, org_id)
    volunteers = db.query(Volunteer).filter(Volunteer.organisation_id == org_id).order_by(Volunteer.created_at.asc()).all()
    hours = db.query(VolunteerHour).filter(VolunteerHour.organisation_id == org_id).order_by(VolunteerHour.created_at.desc()).all()
    agreements = db.query(VolunteerAgreement).filter(VolunteerAgreement.organisation_id == org_id).order_by(VolunteerAgreement.created_at.asc()).all()

    active_count = sum(1 for item in volunteers if item.status == "Active")
    pending_dbs = sum(1 for item in volunteers if item.dbs == "Pending")
    approved_hours = sum(float(item.logged.replace("h", "")) for item in hours if item.status == "Approved" and item.logged.replace(".", "", 1).replace("h", "").isdigit())

    return {
        "summary": {
            "active_volunteers": active_count,
            "inactive_volunteers": max(len(volunteers) - active_count, 0),
            "hours_this_month": round(approved_hours, 1),
            "volunteer_value": "GBP 2,139",
            "dbs_required": pending_dbs,
        },
        "register": [
            {"id": item.id, "name": item.name, "role": item.role, "programme": item.programme, "hours": item.hours, "dbs": item.dbs, "status": item.status}
            for item in volunteers
        ],
        "hours": [
            {"id": item.id, "name": item.volunteer_name, "week": item.week, "logged": item.logged, "approved": item.approved, "value": item.value, "status": item.status}
            for item in hours
        ],
        "agreements": [
            {"id": item.id, "name": item.name, "issued": item.issued, "signed": item.signed, "expires": item.expires, "status": item.status}
            for item in agreements
        ],
    }


@router.post("/volunteers")
async def create_volunteer(data: VolunteerPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = Volunteer(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@router.put("/volunteers/{volunteer_id}")
async def update_volunteer(volunteer_id: int, data: VolunteerPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(Volunteer).filter(Volunteer.id == volunteer_id, Volunteer.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    for key, value in data.model_dump().items():
        setattr(record, key, value)
    db.commit()
    return {"success": True}


@router.post("/volunteer-hours")
async def create_volunteer_hours(data: VolunteerHourPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = VolunteerHour(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@router.put("/volunteer-hours/{hour_id}")
async def update_volunteer_hours(hour_id: int, data: VolunteerHourPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(VolunteerHour).filter(VolunteerHour.id == hour_id, VolunteerHour.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Volunteer hours record not found")
    for key, value in data.model_dump().items():
        setattr(record, key, value)
    db.commit()
    return {"success": True}


@router.get("/governance")
async def get_governance(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organisation_id
    _seed_governance(db, org_id)
    trustees = db.query(Trustee).filter(Trustee.organisation_id == org_id).order_by(Trustee.created_at.asc()).all()
    return {
        "summary": {
            "trustee_count": len(trustees),
            "conflicts_declared": sum(1 for item in trustees if item.coi and item.coi.lower() != "none declared"),
            "board_meetings": 4,
            "cic_report_due": "31 Jan",
        },
        "interest_note": "No conflicts declared. Board members should declare interests annually.",
        "trustees": [
            {"id": item.id, "name": item.name, "role": item.role, "appointed": item.appointed, "status": item.status, "coi": item.coi}
            for item in trustees
        ],
    }


@router.post("/governance/trustees")
async def create_trustee(data: TrusteePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = Trustee(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@router.put("/governance/trustees/{trustee_id}")
async def update_trustee(trustee_id: int, data: TrusteePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(Trustee).filter(Trustee.id == trustee_id, Trustee.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Trustee not found")
    for key, value in data.model_dump().items():
        setattr(record, key, value)
    db.commit()
    return {"success": True}


@router.get("/ukvi")
async def get_ukvi(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organisation_id
    _seed_ukvi(db, org_id)
    workers = db.query(UkviWorker).filter(UkviWorker.organisation_id == org_id).order_by(UkviWorker.created_at.asc()).all()
    cos_records = db.query(UkviCosRecord).filter(UkviCosRecord.organisation_id == org_id).order_by(UkviCosRecord.created_at.asc()).all()
    duties = db.query(UkviDuty).filter(UkviDuty.organisation_id == org_id).order_by(UkviDuty.created_at.asc()).all()

    return {
        "summary": {
            "licence_status": "Active",
            "sponsored_workers": len(workers),
            "cos_available": sum(1 for item in cos_records if item.status == "Available"),
            "reporting_duties": sum(1 for item in duties if item.status in ["Overdue", "Due"]),
        },
        "duty_log": next((item.latest_note for item in duties if item.latest_note), "No report has been submitted from this screen yet."),
        "workers": [
            {"id": item.id, "name": item.name, "role": item.role, "cos": item.cos, "startDate": item.start_date, "visaExpiry": item.visa_expiry, "rtw": item.rtw, "status": item.status}
            for item in workers
        ],
        "cos_records": [
            {"id": item.id, "cosRef": item.cos_ref, "worker": item.worker, "type": item.type, "issued": item.issued, "status": item.status}
            for item in cos_records
        ],
        "duties": [
            {"id": item.id, "duty": item.duty, "trigger": item.trigger, "deadline": item.deadline, "status": item.status}
            for item in duties
        ],
    }


@router.post("/ukvi/workers")
async def create_ukvi_worker(data: UkviWorkerPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = UkviWorker(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@router.put("/ukvi/workers/{worker_id}")
async def update_ukvi_worker(worker_id: int, data: UkviWorkerPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(UkviWorker).filter(UkviWorker.id == worker_id, UkviWorker.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Sponsored worker not found")
    for key, value in data.model_dump().items():
        setattr(record, key, value)
    db.commit()
    return {"success": True}


@router.post("/ukvi/cos")
async def create_ukvi_cos(data: UkviCosPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = UkviCosRecord(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@router.put("/ukvi/cos/{cos_id}")
async def update_ukvi_cos(cos_id: int, data: UkviCosPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(UkviCosRecord).filter(UkviCosRecord.id == cos_id, UkviCosRecord.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="CoS record not found")
    for key, value in data.model_dump().items():
        setattr(record, key, value)
    db.commit()
    return {"success": True}


@router.post("/ukvi/duties/{duty_id}/report")
async def report_ukvi_duty(duty_id: int, note: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(UkviDuty).filter(UkviDuty.id == duty_id, UkviDuty.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Duty not found")
    record.status = "Reported"
    record.latest_note = note or f"{record.duty} reported."
    db.commit()
    return {"success": True, "latest_note": record.latest_note}


@router.get("/hr")
async def get_hr_workspace(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.organisation_id
    _seed_hr(db, org_id)

    employees = db.query(Employee).filter(Employee.organisation_id == org_id, Employee.is_active == True).order_by(Employee.full_name.asc()).all()
    rtw_records = db.query(HrRightToWorkRecord).filter(HrRightToWorkRecord.organisation_id == org_id).order_by(HrRightToWorkRecord.name.asc()).all()
    dbs_records = db.query(HrDbsRecord).filter(HrDbsRecord.organisation_id == org_id).order_by(HrDbsRecord.name.asc()).all()
    leave_records = db.query(HrLeaveRequest).filter(HrLeaveRequest.organisation_id == org_id).order_by(HrLeaveRequest.created_at.desc()).all()
    review_records = db.query(HrPerformanceReview).filter(HrPerformanceReview.organisation_id == org_id).order_by(HrPerformanceReview.created_at.desc()).all()
    contract_records = db.query(HrContractDocument).filter(HrContractDocument.organisation_id == org_id).order_by(HrContractDocument.created_at.desc()).all()

    rtw_lookup = {item.name: item for item in rtw_records}
    dbs_lookup = {item.name: item for item in dbs_records}

    employee_rows = []
    for employee in employees:
        rtw = rtw_lookup.get(employee.full_name)
        dbs = dbs_lookup.get(employee.full_name)
        employee_rows.append(
            {
                "id": employee.id,
                "name": employee.full_name,
                "role": employee.role_title or "Team Member",
                "dept": "Core Ops",
                "type": "FT" if employee.contract_type == "full_time" else "PT",
                "status": "Active" if employee.is_active else "Inactive",
                "rtw": rtw.status if rtw else "Pending",
                "dbs": dbs.level if dbs else "Pending",
            }
        )

    return {
        "summary": {
            "headcount": len(employee_rows),
            "expired_rtw": sum(1 for item in rtw_records if item.status == "Expired"),
            "dbs_due": sum(1 for item in dbs_records if item.status == "Due Soon"),
            "open_vacancies": 2,
            "onboarding_count": 0,
        },
        "employees": employee_rows,
        "rtw": [
            {"id": item.id, "name": item.name, "docType": item.doc_type, "checked": item.checked, "expires": item.expires, "status": item.status}
            for item in rtw_records
        ],
        "dbs": [
            {"id": item.id, "name": item.name, "level": item.level, "issued": item.issued, "renewal": item.renewal, "status": item.status}
            for item in dbs_records
        ],
        "leave": [
            {"id": item.id, "name": item.name, "type": item.leave_type, "from": item.date_from, "to": item.date_to, "days": item.days, "status": item.status}
            for item in leave_records
        ],
        "performance": [
            {"id": item.id, "name": item.name, "reviewer": item.reviewer, "type": item.review_type, "due": item.due, "status": item.status}
            for item in review_records
        ],
        "contracts": [
            {"id": item.id, "name": item.name, "docType": item.doc_type, "issued": item.issued, "expires": item.expires, "status": item.status}
            for item in contract_records
        ],
    }


@router.post("/hr/leave/{leave_id}/approve")
async def approve_hr_leave(leave_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(HrLeaveRequest).filter(HrLeaveRequest.id == leave_id, HrLeaveRequest.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Leave request not found")
    record.status = "Approved"
    db.commit()
    return {"success": True}


@router.post("/hr/rtw/{rtw_id}/renew")
async def renew_hr_rtw(rtw_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(HrRightToWorkRecord).filter(HrRightToWorkRecord.id == rtw_id, HrRightToWorkRecord.organisation_id == current_user.organisation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="RTW record not found")
    record.checked = datetime.utcnow().strftime("%d %b %Y")
    record.expires = "31 Dec 2026"
    record.status = "Valid"
    db.commit()
    return {"success": True}


@router.post("/hr/reviews")
async def create_hr_review(data: HrReviewPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = HrPerformanceReview(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@router.post("/hr/contracts")
async def create_hr_contract(data: HrContractPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = HrContractDocument(organisation_id=current_user.organisation_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}
