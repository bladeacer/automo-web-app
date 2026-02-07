import ApiService from "@/services/ApiService";
import { SignInResponse } from "@/@types/auth";

export const AuthService = {
    async signIn(username: string, password: string): Promise<SignInResponse> {
        const res = await ApiService.fetchData<{ username: string, password: string }, SignInResponse>({
            url: '/login',
            method: 'POST',
            data: { username, password }
        });
        return res.data;
    },

    async signUp(username: string, email: string, password: string, name: string): Promise<any> {
        const res = await ApiService.fetchData<{ username: string, email: string, password: string, name: string }, any>({
            url: '/register',
            method: 'POST',
            data: { username, email, password, name }
        });
        return res.data;
    },

    async deleteUser(fullName: string): Promise<{ message: string }> {
        const res = await ApiService.fetchData<{ username: string }, { message: string }>({
            url: '/delete-user',
            method: 'DELETE',
            data: { username: fullName }
        });
        return res.data;
    },

    async updateUser(currentFullName: string, data: { fullName?: string, email?: string }): Promise<any> {
        const res = await ApiService.fetchData<any, any>({
            url: '/update-user',
            method: 'PUT',
            data: { 
                currentUsername: currentFullName,
                ...data 
            }
        });
        return res.data;
    }
};
