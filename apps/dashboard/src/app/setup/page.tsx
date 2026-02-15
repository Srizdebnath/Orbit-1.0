export default function SetupPage() {
  const steps = [
    { title: "Install Orbit", command: "npm install -g @your-npm-username/orbit" },
    { title: "Login", command: "orbit login" },
    { title: "Launch", command: "orbit deploy" }
  ];

  return (
    <div className="max-w-4xl mx-auto py-20 px-6">
      <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-12 underline">Getting Started</h2>
      
      <div className="space-y-12">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-8 items-start group">
            <span className="text-4xl font-black text-gray-200 group-hover:text-blue-600 transition-colors">0{i+1}</span>
            <div className="flex-1">
              <h3 className="text-xl font-bold uppercase mb-4">{step.title}</h3>
              <div className="bg-[#0a0a0a] text-gray-300 p-4 font-mono text-sm border-2 border-black relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 text-[10px] text-gray-600 uppercase">Terminal</div>
                <span className="text-green-500 mr-2">$</span> {step.command}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}