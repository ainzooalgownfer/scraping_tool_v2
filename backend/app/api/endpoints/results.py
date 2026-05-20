from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from app.database import get_db
from app.models import Result
from app.schemas.result import ResultOut

router = APIRouter()

@router.get("/", response_model=List[ResultOut])
def list_results(
    *,
    db: Session = Depends(get_db),
    job_id: Optional[int] = Query(None, description="Filter by scraping job ID"),
    limit: int = Query(50, ge=1, le=500, description="Number of results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """
    Retrieve scraped results, optionally filtered by job_id.
    Results are ordered by scraped_at descending (newest first).
    """
    query = db.query(Result)
    if job_id is not None:
        query = query.filter(Result.job_id == job_id)
    query = query.order_by(desc(Result.scraped_at))
    results = query.offset(offset).limit(limit).all()
    return results


@router.get("/{result_id}", response_model=ResultOut)
def get_result_by_id(
    result_id: int,
    db: Session = Depends(get_db),
):
    """
    Fetch a single result by its ID.
    """
    result = db.query(Result).filter(Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.delete("/{result_id}", status_code=status.HTTP_200_OK)
def delete_result(
    result_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a single result by its ID.
    """
    
    result = db.query(Result).filter(Result.id == result_id).first()
    
    
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    
    db.delete(result)
    db.commit()
    
    return {"message": f"Result {result_id} successfully deleted", "id": result_id}