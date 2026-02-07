import { useState } from 'react';
import { Paper, TextInput, PasswordInput, Button, Title, Text, Anchor } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { yupResolver } from 'mantine-form-yup-resolver';
import * as yup from 'yup';
import useAuth from "@/utils/hooks/useAuth";
import classes from './SignIn.module.css';
import { notifications } from '@mantine/notifications';

export default function SignUp() {
  const [loading, setLoading] = useState<boolean>(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const schema = yup.object().shape({
    name: yup.string().required('Please enter your full name'),
    username: yup.string().min(3, 'Username must be at least 3 characters').required('Required'),
    email: yup.string().email('Invalid email address').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Required'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password'),
  });

  const form = useForm({
    initialValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: yupResolver(schema),
  });

  async function handleSubmit(values: typeof form.values) {
    setLoading(true);
    try {
      const result = await signUp({
        name: values.name,
        username: values.username,
        email: values.email,
        password: values.password
      });
      
      if (result && !('error' in result)) {
        notifications.show({
          title: 'Registration Successful',
          message: 'You can now sign in with your new account.',
          color: 'green',
        });
        navigate('/sign-in');
      } 
    } catch (e: any) {
      notifications.show({
        title: 'Registration Failed',
        message: e.response?.data?.error || 'Could not create account.',
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
            Create Account
          </Title>

          <TextInput 
            label="Full Name" 
            placeholder="John Doe" 
            size="md"
            {...form.getInputProps('name')} 
          />
          
          <TextInput 
            label="Username" 
            placeholder="johndoe123" 
            mt="md"
            size="md"
            {...form.getInputProps('username')} 
          />

          {/* 4. Added Email TextInput */}
          <TextInput 
            label="Email" 
            placeholder="hello@example.com" 
            mt="md"
            size="md"
            {...form.getInputProps('email')} 
          />
          
          <PasswordInput 
            label="Password" 
            placeholder="Choose a password" 
            mt="md" 
            size="md"
            {...form.getInputProps('password')} 
          />

          <PasswordInput 
            label="Confirm Password" 
            placeholder="Repeat password" 
            mt="md" 
            size="md"
            {...form.getInputProps('confirmPassword')} 
          />
          
          <Button loading={loading} type={'submit'} fullWidth mt="xl" size="md" color="blue">
            Register
          </Button>

          <Text ta="center" mt="md">
            Already have an account?{' '}
            <Anchor fw={700} onClick={() => navigate('/sign-in')}>
              Login
            </Anchor>
          </Text>
        </Paper>
      </form>
    </div>
  );
}
