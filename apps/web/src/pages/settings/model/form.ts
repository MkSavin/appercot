export const formText = (form: FormData, name: string) => String(form.get(name) ?? '')
