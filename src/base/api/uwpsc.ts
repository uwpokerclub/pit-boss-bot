import axios from "axios";
import { uwpscApiAxios } from "../utility/Axios.js";
import type {
    GetRankingResponse,
    ListResponse,
    Member,
    Membership,
    MembershipWithAttendance,
    RankingResponse,
    Semester,
} from "./types.js";

function isNotFound(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 404;
}

function sameEmail(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Ordered by start date descending, so element 0 is the newest semester.
export async function listSemesters(): Promise<Semester[]> {
    const res = await uwpscApiAxios.get<ListResponse<Semester>>("/semesters");
    return res.data.data;
}

// The API's email filter is a partial ILIKE match, so the result is
// re-filtered here for an exact (case-insensitive) match.
export async function findMemberByEmail(email: string): Promise<Member | null> {
    const res = await uwpscApiAxios.get<ListResponse<Member>>("/members", {
        params: { email: email },
    });
    return res.data.data.find(member => sameEmail(member.email, email)) ?? null;
}

// Returns null when no such membership exists in that semester. The endpoint
// is semester-scoped, so a membership from a different semester is a 404.
export async function getMembership(
    semesterId: string,
    membershipId: string,
): Promise<Membership | null> {
    try {
        const res = await uwpscApiAxios.get<Membership>(
            `/semesters/${semesterId}/memberships/${membershipId}`,
        );
        return res.data;
    } catch (error) {
        if (isNotFound(error)) {
            return null;
        }
        throw error;
    }
}

// The v2 memberships endpoint has no userId filter, so this queries by email
// (a partial ILIKE match) and narrows to the exact user client-side.
export async function findMembership(
    semesterId: string,
    email: string,
    userId: number,
): Promise<MembershipWithAttendance | null> {
    const res = await uwpscApiAxios.get<ListResponse<MembershipWithAttendance>>(
        `/semesters/${semesterId}/memberships`,
        { params: { email: email } },
    );
    return res.data.data.find(membership => membership.userId === userId) ?? null;
}

// paid/discounted are sent explicitly: the API rejects paid=false with
// discounted=true, and an unpaid membership is what the bot has always created.
export async function createMembership(
    semesterId: string,
    userId: number,
): Promise<Membership> {
    const res = await uwpscApiAxios.post<Membership>(
        `/semesters/${semesterId}/memberships`,
        { userId: userId, paid: false, discounted: false },
    );
    return res.data;
}

// Capped at 100 entries by the API's max page size.
export async function listRankings(semesterId: string): Promise<RankingResponse[]> {
    const res = await uwpscApiAxios.get<ListResponse<RankingResponse>>(
        `/semesters/${semesterId}/rankings`,
    );
    return res.data.data;
}

// Returns null when the member has registered but has not played an event yet.
export async function getRanking(
    semesterId: string,
    membershipId: string,
): Promise<GetRankingResponse | null> {
    try {
        const res = await uwpscApiAxios.get<GetRankingResponse>(
            `/semesters/${semesterId}/rankings/${membershipId}`,
        );
        return res.data;
    } catch (error) {
        if (isNotFound(error)) {
            return null;
        }
        throw error;
    }
}
