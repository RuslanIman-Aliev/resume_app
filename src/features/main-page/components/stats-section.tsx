const stats = [
  { value: "3x", label: "faster job placement" },
  { value: "89%", label: "interview success rate" },
  { value: "50K+", label: "jobs landed" },
  { value: "4.9", label: "average rating" },
];

const StatsSection = () => {
  return (
    <section className="border-y border-border/50 bg-card/30 mb-20 md:mb-28">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
