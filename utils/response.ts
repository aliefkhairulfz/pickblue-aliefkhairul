import { NextResponse } from 'next/server';

export function createSuccessResponse(data: any = {}, statusCode: number = 200) {
    const createMessage = data?.message ? data.message : 'Success';
    const createData = data?.data ? data.data : data;
    const createMeta = data?.meta ? data.meta : {};

    return NextResponse.json(
        {
            ok: true,
            status_code: statusCode,
            message: createMessage,
            data: createData,
            meta: createMeta
        },
        { status: statusCode }
    );
}

export function createErrorResponse(message: string, statusCode: number = 400, errors: any = []) {
    return NextResponse.json(
        {
            ok: false,
            status_code: statusCode,
            message: message,
            errors: typeof errors !== 'object' ? [] : errors
        },
        { status: statusCode }
    );
}
