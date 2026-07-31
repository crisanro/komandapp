type Promo = {
  id: string; titulo: string; descripcion: string | null; emoji: string | null;
};

export default function BannerPromociones({ promos = [] }: { promos?: Promo[] }) {
  if (!promos || promos.length === 0) return null;
  return (
    <div className="space-y-2">
      {promos.map(promo => (
        <div key={promo.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--accent-subtle)", border: "1px solid rgba(232,93,4,0.2)" }}>
          <span className="text-2xl shrink-0">{promo.emoji ?? "🎉"}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{promo.titulo}</p>
            {promo.descripcion && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{promo.descripcion}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}