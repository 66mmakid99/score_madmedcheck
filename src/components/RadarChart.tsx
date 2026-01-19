// src/components/RadarChart.tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  data: {
    academic: number;
    clinical: number;
    career: number;
    safety: number;
    activity: number;
  };
  color?: string;
}

export default function DoctorRadarChart({ data, color = '#dc2626' }: Props) {
  const chartData = [
    { subject: '학술', value: data.academic, fullMark: 100 },
    { subject: '임상', value: data.clinical, fullMark: 100 },
    { subject: '경력', value: data.career, fullMark: 100 },
    { subject: '안전', value: data.safety, fullMark: 100 },
    { subject: '활동', value: data.activity, fullMark: 100 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
          <Radar
            name="능력치"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
