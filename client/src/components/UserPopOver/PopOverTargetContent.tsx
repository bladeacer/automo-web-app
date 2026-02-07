import {Avatar, Text} from "@mantine/core";
import classes from './PopOverTargetContent.module.css'
import {useAppSelector} from "@/store";

export default function PopOverTargetContent(){
  const { fullName, email } = useAppSelector((state) => state.auth.user);

  const getInitials = (name: string | undefined | null) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const initials = getInitials(fullName);

  return (
    <div className={classes.contentWrapper}>
      <Avatar color={'blue'} radius={'lg'}>
        {initials}
      </Avatar>
      <div>
        <Text style={{ fontWeight: 'bold' }} size="md">
          {fullName || 'User'}
        </Text>
        <Text size="xs">
          {email}
        </Text>
      </div>
    </div>
  );
}
