<script lang="ts">
  import Tabs from "./tabs.svelte";
  import TabsContent from "./tabs-content.svelte";
  import TabsList from "./tabs-list.svelte";
  import TabsTrigger from "./tabs-trigger.svelte";

  let { value = $bindable("a") } = $props();
</script>

<Tabs bind:value>
  <TabsList>
    <TabsTrigger value="a">Tab A</TabsTrigger>
    <TabsTrigger value="b">Tab B</TabsTrigger>
  </TabsList>
  <TabsContent value="a">Content A</TabsContent>
  <TabsContent value="b">Content B</TabsContent>
</Tabs>
