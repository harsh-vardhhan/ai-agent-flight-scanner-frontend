import React, { useState } from "react";
import axios from "axios";
import {
  Button,
  Input,
  useToast,
  Box,
  Heading,
  VStack,
  Container,
  Text,
  Stack,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // For support of tables and other GitHub Flavored Markdown

const App = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Predefined prompts
  const prompts = [
    "What is the cheapest flight from New Delhi to Hanoi?",
    "Find the cheapest round trip from New Delhi to Hanoi?",
    "Find the cheapest return flight between New Delhi and Hanoi with at least 7 days gap?",
    "List round trip flights between Mumbai and Phu Quoc?",
  ];

  const handleSubmit = async (query) => {
    const currentQuestion = query || question;

    if (!currentQuestion.trim()) {
      toast({
        title: "Please enter a question",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/query", {
        question: currentQuestion,
      });

      // Use the final_response field from the backend
      setAnswer(response.data.final_response || "No answer found.");
    } catch (error) {
      toast({
        title: "Error querying the API",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.md" mt={8}>
      <VStack spacing={6}>
        <Box w="full">
          <Heading as="h1" size="xl" textAlign="center" mb={4}>
            Flight Query
          </Heading>
          <Text textAlign="center" color="gray.500">
            Ask about the cheapest flights from one city to another
          </Text>
        </Box>

        {/* Question Input Section */}
        <Box w="full" bg="white" p={6} boxShadow="md" borderRadius="md">
          <Input
            as="textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about flights"
            size="lg"
            mb={4}
            variant="filled"
            resize="none"
            rows={4}
            overflow="hidden"
            whiteSpace="pre-wrap"
            style={{ height: "auto" }}
          />
          <Button
            isLoading={loading}
            loadingText="Searching"
            colorScheme="blue"
            onClick={() => handleSubmit()}
            w="full"
          >
            Submit
          </Button>
        </Box>

        {/* Answer Section */}
        {answer && (
          <Box w="full" p={6} bg="white" boxShadow="md" borderRadius="md">
            <Heading as="h3" size="md" mb={4}>
              Answer:
            </Heading>
            <Box overflowX="auto" scrollBehavior="smooth">
              <ReactMarkdown children={answer} remarkPlugins={[remarkGfm]} />
            </Box>
          </Box>
        )}

        {/* Predefined Prompts Section */}
        <Box w="full" bg="white" p={6} boxShadow="md" borderRadius="md">
          <Heading as="h3" size="md" mb={4}>
            Predefined Prompts:
          </Heading>
          <Stack spacing={3}>
            {prompts.map((prompt, index) => (
              <Button
                key={index}
                colorScheme="teal"
                variant="outline"
                w="full"
                textAlign="left"
                whiteSpace="normal" // Ensures text wraps within the button
                wordBreak="break-word" // Breaks text at word boundaries if too long
                onClick={() => {
                  setQuestion(prompt);
                  handleSubmit(prompt);
                }}
              >
                {prompt}
              </Button>
            ))}
          </Stack>
        </Box>

      </VStack>
    </Container>
  );
};

export default App;
