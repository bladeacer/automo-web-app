import { Popover, Text } from "@mantine/core";
import PopOverTargetContent from "@/components/UserPopOver/PopOverTargetContent";
import { useNavigate } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";

export default function UserPopOver() {
  const [opened, { close, open }] = useDisclosure(false);
  const navigate = useNavigate();

  return (
    <Popover
      width={200}
      position="right"
      opened={opened}
      offset={{ mainAxis: 13, crossAxis: 0 }}
      withinPortal
      withArrow
    >
      <Popover.Target>
        <div 
          onClick={() => navigate('/settings')} 
          onMouseEnter={open} 
          onMouseLeave={close}
          style={{ cursor: 'pointer' }}
        >
          <PopOverTargetContent />
        </div>
      </Popover.Target>
      
      <Popover.Dropdown style={{ pointerEvents: 'none' }}>
        <Text size="xs" fw={500}>
          Click to manage settings
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}
