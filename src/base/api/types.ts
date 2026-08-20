// TypeScript mirrors of the uwpokerclub/website v2 API response models.
// Source of truth: server/internal/models/ in that repository.


// Envelope returned by every v2 list endpoint. Single-resource endpoints
// return the bare object instead.
export interface ListResponse<T> {
    data: T[];
    total: number;
}


// models.User, serialized as "Member" by the v2 members controller.
export interface Member {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    faculty: string;
    questId: string;
    createdAt: string;
}


export interface Semester {
    id: string;
    name: string;
    meta: string;
    startDate: string;
    endDate: string;
    startingBudget: number;
    currentBudget: number;
    membershipFee: number;
    membershipDiscountFee: number;
    rebuyFee: number;
}


export interface Ranking {
    id: number;
    membershipId: string;
    points: number;
    attendance: number;
}


export interface Membership {
    id: string;
    userId: number;
    user: Member | null;
    semesterId: string;
    semester: Semester | null;
    paid: boolean;
    discounted: boolean;
    ranking: Ranking | null;
}


// Returned by GET /semesters/{semesterId}/memberships.
export interface MembershipWithAttendance extends Membership {
    attendance: number;
}


// Returned by GET /semesters/{semesterId}/rankings.
export interface RankingResponse {
    id: number;
    firstName: string;
    lastName: string;
    points: number;
    position: number;
}


// Returned by GET /semesters/{semesterId}/rankings/{membershipId}.
export interface GetRankingResponse {
    points: number;
    position: number;
}
