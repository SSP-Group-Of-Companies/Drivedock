"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    applicationFormPage1Schema,
    ApplicationFormPage1Schema,
} from "@/lib/zodSchemas/applicationFormPage1.schema";

type Page5ClientProps = {
    defaultValues: ApplicationFormPage1Schema;
    trackerId: string;
};

export default function Page1Client({
    defaultValues,
}: Page5ClientProps) {
    const methods = useForm<ApplicationFormPage1Schema>({
        resolver: zodResolver(applicationFormPage1Schema),
        mode: "onChange",
        defaultValues,
    });

    const onSubmit = () => {
        // Not used — handled by ContinueButton
    };

    return (
        <FormProvider {...methods}>
            <form
                className="space-y-8"
                onSubmit={methods.handleSubmit(onSubmit)}
                noValidate
            >

            </form>
        </FormProvider>
    );
}
