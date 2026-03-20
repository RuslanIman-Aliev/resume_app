import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  CalendarPlus,
} from "lucide-react";

const interviews = [
  {
    id: 1,
    company: "TechCorp Inc.",
    role: "Senior Frontend Engineer",
    date: "Tomorrow",
    time: "10:00 AM",
    type: "video",
    round: "Technical",
  },
  {
    id: 2,
    company: "StartupXYZ",
    role: "Full Stack Developer",
    date: "Mar 20",
    time: "2:00 PM",
    type: "phone",
    round: "Screening",
  },
  {
    id: 3,
    company: "DataFlow",
    role: "React Developer",
    date: "Mar 23",
    time: "11:30 AM",
    type: "onsite",
    round: "Final",
  },
];

const typeIcons = {
  video: Video,
  phone: Phone,
  onsite: MapPin,
};

const typeLabels = {
  video: "Video Call",
  phone: "Phone Call",
  onsite: "On-site",
};

const UpcomingInterviews = () => {
  return (
    <section>
      <Card className="p-6">
        <h1 className="text-lg font-bold mb-2">Upcoming Interviews</h1>
        {interviews.map(({ id, company, role, date, time, type, round }) => {
          const TypeIcon = typeIcons[type as keyof typeof typeIcons];
          return (
            <div key={id} className="">
              <div className="flex flex-col  w-full rounded-lg  py-2 px-4 transition-all hover:border-border hover:bg-secondary/50">
                <div className="flex items-center justify-between">
                  <div>{company}</div>
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {round}
                    </Badge>
                  </div>
                </div>

                <div className="text-muted-foreground">{role}</div>

                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {time}
                  </span>
                  <span className="flex items-center gap-1">
                    <TypeIcon className="h-3 w-3" />
                    {typeLabels[type as keyof typeof typeLabels]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <Button
          variant="outline"
          className="w-full bg-black! py-4  mt-2 hover:bg-primary! hover:text-primary-foreground! cursor-pointer"
          size="sm"
        >
          <CalendarPlus className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </Card>
    </section>
  );
};

export default UpcomingInterviews;
