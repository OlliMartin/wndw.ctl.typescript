import { onLCP, onINP, onCLS, onTTFB } from 'web-vitals';

type ReportHandler = (metric: {
  name: string;
  value: number;
  id: string;
}) => void;

const reportWebVitals = (onPerfEntry?: ReportHandler): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onLCP(onPerfEntry);
    onINP(onPerfEntry);
    onCLS(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};

export default reportWebVitals;
