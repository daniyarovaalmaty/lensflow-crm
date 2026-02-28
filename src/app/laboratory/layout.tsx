import LabNav from '@/components/layout/LabNav';

export default function LaboratoryLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <LabNav />
            {children}
        </>
    );
}
