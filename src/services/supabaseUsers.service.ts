import { supabase } from "../config/supabase";

interface SupabaseUserInput {
    uid: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
}

export async function syncSupabaseUser(input: SupabaseUserInput) {
    const { data, error } = await supabase
        .from("users")
        .upsert(
            {
                firebase_uid: input.uid,
                name: input.name ?? "",
                email: input.email,
                email_verified: input.emailVerified,
                picture: input.picture ?? null,
                last_login_at: new Date().toISOString(),
            },
            { onConflict: "firebase_uid" },
        )
        .select("id")
        .single();

    if (error) throw error;

    const id: string = data.id;

    return id;
}