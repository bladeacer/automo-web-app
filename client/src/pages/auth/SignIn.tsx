import { useState } from 'react';
import { Paper, TextInput, PasswordInput, Button, Title, Text, Anchor } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { yupResolver } from 'mantine-form-yup-resolver';
import * as yup from 'yup';
import useAuth from "@/utils/hooks/useAuth";
import classes from './SignIn.module.css';
import { notifications } from '@mantine/notifications';

export default function SignIn() {
  const [loading, setLoading] = useState<boolean>(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const schema = yup.object().shape({
    username: yup.string().required('Please enter your username'),
    password: yup.string().required('Please enter your password'),
  });

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: yupResolver(schema),
  });

  async function handleSubmit(values: typeof form.values) {
    setLoading(true);
    try {
      const result = await signIn(values);

      if (result && (result as any).status === 'failed') {
        notifications.show({
          title: 'Login Failed',
          message: (result as any).message || 'Invalid username or password.',
          color: 'red',
        });
      } else if (result) {
        notifications.show({
          title: 'Welcome back!',
          message: 'Login successful.',
          color: 'blue',
        });
      }
    } catch (e: any) {
      notifications.show({
        title: 'Login Error',
        message: 'An unexpected error occurred.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={classes.wrapper}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Paper className={classes.form} radius={0} p={30}>
          <Title order={2} className={classes.title} ta="center" mt="md" mb={20}>
            Welcome Back
          </Title>
          
          <TextInput 
            label="Username" 
            placeholder="Your username" 
            size="md"
            {...form.getInputProps('username')} 
          />
          
          <PasswordInput 
            label="Password" 
            placeholder="Your password" 
            mt="md" 
            size="md"
            {...form.getInputProps('password')} 
          />
          
          <Button loading={loading} type={'submit'} fullWidth mt="xl" size="md">
            Login
          </Button>

          <Text ta="center" mt="md">
            Don't have an account?{' '}
            <Anchor fw={700} onClick={() => navigate('/sign-up')}>
              Register
            </Anchor>
          </Text>
        </Paper>
      </form>
    </div>
  );
}
