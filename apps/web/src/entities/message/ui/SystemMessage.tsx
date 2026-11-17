export const SystemMessage = ({ text }: { text: string }) => (
  <div className="flex justify-center py-4" role="status">
    <p className="max-w-[90%] rounded-full bg-secondary px-3 py-1 text-center text-xs leading-5 text-muted-foreground">
      {text}
    </p>
  </div>
)
